import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { createConnection, type Connection } from "../../src/db/create";
import { authenticatePassword, findSessionUser, LOGIN_FAILURE_LIMIT, LOGIN_WINDOW_MS, replacePassword, upsertLogin } from "../../src/db/auth";
import * as schema from "../../src/db/schema";

const run = promisify(execFile);

test("durable login failures survive races and independent workers; resets revoke both sessions", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "meals-auth-test-"));
  const originalUrl = process.env.DATABASE_URL;
  const originalDirectory = process.env.PGLITE_DIR;
  process.env.DATABASE_URL = "";
  process.env.PGLITE_DIR = directory;
  let connection: Connection | undefined;
  t.after(async () => {
    try { await connection?.close(); } finally {
      if (originalUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalUrl;
      if (originalDirectory === undefined) delete process.env.PGLITE_DIR; else process.env.PGLITE_DIR = originalDirectory;
      await rm(directory, { recursive: true, force: true });
    }
  });
  connection = await createConnection();
  await connection.migrate();
  await connection.migrate();
  const email = "auth-fixture@example.test";
  const password = randomBytes(24).toString("hex");
  await upsertLogin(connection.db, email, "Synthetic Auth Member", await bcrypt.hash(password, 12));
  const now = new Date("2026-10-02T12:00:00Z");
  const first = await authenticatePassword(connection.db, email, password, now);
  assert.ok(first);
  const second = { ...first };
  assert.ok(await findSessionUser(connection.db, first));
  assert.ok(await findSessionUser(connection.db, second));

  // Concurrent attempts must cap failures rather than losing increments.
  const outcomes = await Promise.all(Array.from({ length: 12 }, () => authenticatePassword(connection!.db, email, "incorrect", now)));
  assert.ok(outcomes.every((outcome) => outcome === null));
  const [limiter] = await connection.db.select().from(schema.loginAttempts);
  assert.equal(limiter.failures, LOGIN_FAILURE_LIMIT);
  assert.equal(await authenticatePassword(connection.db, email, password, now), null);

  await connection.close(); connection = undefined;
  // Independent application worker after restart must observe the same lockout.
  const workerEnv = { ...process.env, DATABASE_URL: "", PGLITE_DIR: directory, AUTH_TEST_EMAIL: email, AUTH_TEST_PASSWORD: password, AUTH_TEST_TIME: now.toISOString() };
  const blocked = await run(process.execPath, ["--import", "tsx", "tests/fixtures/auth-worker.ts"], { env: workerEnv });
  assert.equal(blocked.stdout.trim(), "rejected");
  const recovered = await run(process.execPath, ["--import", "tsx", "tests/fixtures/auth-worker.ts"], {
    env: { ...workerEnv, AUTH_TEST_TIME: new Date(now.getTime() + LOGIN_WINDOW_MS).toISOString() },
  });
  assert.equal(recovered.stdout.trim(), "authenticated");
  connection = await createConnection();
  assert.equal((await connection.db.select().from(schema.loginAttempts))[0].failures, 0);

  const nextPassword = randomBytes(24).toString("hex");
  assert.equal(await replacePassword(connection.db, first.id, first.sessionVersion, await bcrypt.hash(nextPassword, 12)), true);
  assert.equal(await findSessionUser(connection.db, first), null);
  assert.equal(await findSessionUser(connection.db, second), null);
  assert.equal(await replacePassword(connection.db, first.id, first.sessionVersion, await bcrypt.hash(password, 12)), false);
  const later = new Date(now.getTime() + LOGIN_WINDOW_MS + 1);
  assert.equal(await authenticatePassword(connection.db, email, password, later), null);
  const renewed = await authenticatePassword(connection.db, email, nextPassword, later);
  assert.ok(renewed);
  assert.equal(renewed.sessionVersion, first.sessionVersion + 1);

  // The actual CLI reset uses exactly the Settings validation and revokes sessions.
  await connection.close(); connection = undefined;
  const resetPassword = randomBytes(24).toString("hex");
  await run(process.execPath, ["--import", "tsx", "scripts/seed-user.ts", ` ${email.toUpperCase()} `, "Synthetic Auth Member", resetPassword], { env: { ...process.env, DATABASE_URL: "", PGLITE_DIR: directory } });
  connection = await createConnection();
  assert.equal(await findSessionUser(connection.db, renewed), null);
  const reset = await authenticatePassword(connection.db, email, resetPassword, later);
  assert.ok(reset);
  assert.equal(reset.sessionVersion, renewed.sessionVersion + 1);
  const beforeInvalid = await connection.db.select().from(schema.users);
  await assert.rejects(run(process.execPath, ["--import", "tsx", "scripts/seed-user.ts", "invalid-email", "Synthetic", resetPassword], { env: { ...process.env, DATABASE_URL: "", PGLITE_DIR: directory } }));
  assert.deepEqual(await connection.db.select().from(schema.users), beforeInvalid);
  assert.equal(await authenticatePassword(connection.db, "missing@example.test", "incorrect", later), null);
  await connection.db.delete(schema.users).where(eq(schema.users.id, reset.id));
  assert.equal(await findSessionUser(connection.db, reset), null);
});
