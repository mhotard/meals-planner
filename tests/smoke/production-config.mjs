import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Run after a production build. No env-file loader or database connection.
const directory = await mkdtemp(join(tmpdir(), "meals-config-smoke-"));
try {
  for (const [name, overrides, message] of [
    ["missing database", { DATABASE_URL: "", AUTH_SECRET: randomBytes(32).toString("hex") }, "DATABASE_URL is required"],
    ["missing signing secret", { DATABASE_URL: "postgres://configuration.invalid/test", AUTH_SECRET: "" }, "AUTH_SECRET is required"],
    ["short signing secret", { DATABASE_URL: "postgres://configuration.invalid/test", AUTH_SECRET: "synthetic-short" }, "AUTH_SECRET must contain at least 32 bytes"],
  ]) {
    const reservation = createServer();
    reservation.listen(0, "127.0.0.1");
    await once(reservation, "listening");
    const port = reservation.address().port;
    await new Promise(resolve => reservation.close(resolve));
    const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
      env: { ...process.env, NODE_ENV: "production", NEXT_PHASE: "phase-production-server", PGLITE_DIR: join(directory, "must-not-be-created"), NEXT_TELEMETRY_DISABLED: "1", ...overrides },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", value => { output += value; });
    child.stderr.on("data", value => { output += value; });
    let status;
    try {
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        try {
          const response = await fetch("http://127.0.0.1:" + port + "/login", { signal: AbortSignal.timeout(1000) });
          status = response.status;
          await response.text();
          break;
        } catch {
          if (child.exitCode !== null || child.signalCode !== null) break;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      // next start retains the listener after instrumentation failure; verify
      // failed application preparation and HTTP500, not a fictitious exit1.
      assert.equal(status, 500, name + " must reject requests");
      assert.ok(output.includes(message), name + " preflight must execute");
      assert.equal(existsSync(join(directory, "must-not-be-created")), false);
      console.log(name + ": preflight rejected request (HTTP500); no local database opened");
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, "exit");
        child.kill("SIGTERM");
        const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
        try { await exited; } finally { clearTimeout(timer); }
      }
    }
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
