import "server-only";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

/**
 * One schema, two drivers:
 *   - DATABASE_URL set   -> real Postgres (Neon in production)
 *   - DATABASE_URL unset -> PGlite, an embedded Postgres stored in .pglite/
 *
 * Both speak the same dialect and expose the same query builder, so the rest
 * of the app is typed against a single `DB` and never branches on the driver.
 */
export type DB = PostgresJsDatabase<typeof schema>;

async function createDb(): Promise<DB> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const client = postgres(url, { max: 1, prepare: false });
    return drizzle(client, { schema });
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite(process.env.PGLITE_DIR ?? ".pglite");
  return drizzle(client, { schema }) as unknown as DB;
}

// Cached on globalThis so Next's dev hot-reload doesn't open a second PGlite
// handle on the same data directory.
const globalForDb = globalThis as unknown as { __mealsDb?: Promise<DB> };

export function getDb(): Promise<DB> {
  globalForDb.__mealsDb ??= createDb();
  return globalForDb.__mealsDb;
}

export { schema };
