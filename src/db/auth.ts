import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";
import type { SessionUser } from "@/lib/auth-token";
import type { DB } from "./create";
import * as schema from "./schema";

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_FAILURE_LIMIT = 10;
// A fixed synthetic hash keeps missing-account work comparable to a bad password.
const DUMMY_HASH = "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";

export async function findSessionUser(db: DB, claims: SessionUser): Promise<SessionUser | null> {
  const [user] = await db.select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, sessionVersion: schema.users.sessionVersion })
    .from(schema.users).where(and(eq(schema.users.id, claims.id), eq(schema.users.sessionVersion, claims.sessionVersion))).limit(1);
  return user ?? null;
}

/**
 * The upsert locks the account row until bcrypt and the result commit. Independent
 * Postgres workers therefore share the exact same failure budget, including races.
 * PGlite tests exercise concurrent calls and persistence across process restart.
 */
export async function authenticatePassword(db: DB, email: string, password: string, now = new Date()): Promise<SessionUser | null> {
  const accountKey = createHash("sha256").update(email).digest("hex");
  return db.transaction(async (tx) => {
    const [attempt] = await tx.insert(schema.loginAttempts).values({ accountKey, windowStartedAt: now })
      .onConflictDoUpdate({ target: schema.loginAttempts.accountKey, set: { accountKey } }).returning();
    const expired = now.getTime() >= attempt.windowStartedAt.getTime() + LOGIN_WINDOW_MS;
    const failures = expired ? 0 : attempt.failures;
    const windowStartedAt = expired ? now : attempt.windowStartedAt;
    if (failures >= LOGIN_FAILURE_LIMIT) return null;
    const [user] = await tx.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    const matches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    await tx.update(schema.loginAttempts).set({ failures: matches && user ? 0 : failures + 1, windowStartedAt })
      .where(eq(schema.loginAttempts.accountKey, accountKey));
    return matches && user ? { id: user.id, name: user.name, email: user.email, sessionVersion: user.sessionVersion } : null;
  });
}

/** Optimistic version guard prevents a concurrent reset/change from being overwritten. */
export async function replacePassword(db: DB, userId: number, expectedVersion: number, passwordHash: string): Promise<boolean> {
  const changed = await db.update(schema.users).set({ passwordHash, sessionVersion: sql`${schema.users.sessionVersion} + 1` })
    .where(and(eq(schema.users.id, userId), eq(schema.users.sessionVersion, expectedVersion))).returning({ id: schema.users.id });
  return changed.length === 1;
}

export async function upsertLogin(db: DB, email: string, name: string, passwordHash: string): Promise<void> {
  await db.insert(schema.users).values({ email, name, passwordHash })
    .onConflictDoUpdate({ target: schema.users.email, set: { name, passwordHash, sessionVersion: sql`${schema.users.sessionVersion} + 1` } });
}
