/** Applies ./drizzle SQL migrations to whichever database is configured. */
async function main() {
  const url = process.env.DATABASE_URL;
  const config = { migrationsFolder: "./drizzle" };

  if (url) {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const client = postgres(url, { max: 1 });
    await migrate(drizzle(client), config);
    await client.end();
    console.log("Migrated Postgres at", new URL(url).host);
    return;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite(process.env.PGLITE_DIR ?? ".pglite");
  try {
    await client.query("select 1");
  } catch {
    throw new Error(
      "Can't open the local database — stop the dev server first (PGlite is single-process).",
    );
  }
  await migrate(drizzle(client), config);
  await client.close();
  console.log("Migrated local PGlite database in .pglite/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
