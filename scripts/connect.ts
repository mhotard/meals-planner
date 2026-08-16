import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";

type DB = PostgresJsDatabase<typeof schema>;

/** Shared connector for CLI scripts: Postgres if DATABASE_URL, else local PGlite. */
export async function connect(): Promise<{ db: DB; close: () => Promise<void> }> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const client = postgres(url, { max: 1 });
    return { db: drizzle(client, { schema }), close: () => client.end() };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite(process.env.PGLITE_DIR ?? ".pglite");

  // PGlite allows exactly one process at a time. If `npm run dev` is holding
  // the directory, the WASM runtime aborts mid-query and can leave the data
  // files unusable — so fail loudly here instead.
  try {
    await client.query("select 1");
  } catch {
    throw new Error(
      "Can't open the local database. Stop the dev server (npm run dev) and try again — " +
        "PGlite only allows one process at a time. This limitation goes away once " +
        "DATABASE_URL points at a real Postgres.",
    );
  }

  return {
    db: drizzle(client, { schema }) as unknown as DB,
    close: () => client.close(),
  };
}
