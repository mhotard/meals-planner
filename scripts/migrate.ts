/** Applies ./drizzle SQL migrations to whichever database is configured. */
import { createConnection } from "../src/db/create";

async function main() {
  const { migrate, close, label } = await createConnection();
  await migrate();
  await close();
  console.log("Migrated", label);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
