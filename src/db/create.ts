import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { requireHostedDatabase } from "@/lib/runtime-config";

/**
 * One schema, two drivers:
 *   - DATABASE_URL set   -> real Postgres (Neon in production)
 *   - DATABASE_URL unset -> PGlite, an embedded Postgres stored in .pglite/
 *
 * Both speak the same dialect and expose the same query builder, so the rest
 * of the app is typed against a single `DB` and never branches on the driver.
 * This file has no `server-only` marker so the CLI scripts can share it; the
 * app goes through ./index.ts, which adds the marker and a process-wide cache.
 */
export type DB = PostgresJsDatabase<typeof schema>;

export type Connection = {
  db: DB;
  /** Where we connected, for script output. */
  label: string;
  /** Apply the SQL migrations in ./drizzle. */
  migrate: () => Promise<void>;
  close: () => Promise<void>;
};

const MIGRATIONS = { migrationsFolder: "./drizzle" };

export async function createConnection(): Promise<Connection> {
  const url = requireHostedDatabase(process.env.NODE_ENV, process.env.DATABASE_URL);

  if (url) {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const client = postgres(url, { max: 1, prepare: false });
    const db = drizzle(client, { schema });
    return {
      db,
      label: `Postgres at ${new URL(url).host}`,
      migrate: async () => {
        const { migrate } = await import("drizzle-orm/postgres-js/migrator");
        await migrate(db, MIGRATIONS);
      },
      close: () => client.end(),
    };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dir = process.env.PGLITE_DIR ?? ".pglite";
  const client = new PGlite(dir);

  // PGlite allows exactly one process at a time. If another process (usually
  // `npm run dev`) is holding the directory, the WASM runtime aborts mid-query
  // and can leave the data files unusable — so fail loudly up front instead.
  try {
    await client.query("select 1");
  } catch {
    throw new Error(
      `Can't open the local database in ${dir}/. Another process is probably using it — ` +
        "stop the dev server (npm run dev) or the script and try again. PGlite only " +
        "allows one process at a time; this goes away once DATABASE_URL points at Postgres.",
    );
  }

  const db = drizzle(client, { schema });
  return {
    db: db as unknown as DB,
    label: `local PGlite database in ${dir}/`,
    migrate: async () => {
      const { migrate } = await import("drizzle-orm/pglite/migrator");
      await migrate(db, MIGRATIONS);
    },
    close: () => client.close(),
  };
}
