/**
 * Create or update a login.
 *   npx tsx scripts/seed-user.ts <email> <name> <password>
 * Works against PGlite locally, or Postgres when DATABASE_URL is set.
 */
import "./env";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { createConnection } from "../src/db/create";

async function main() {
  const [email, name, password] = process.argv.slice(2);
  if (!email || !name || !password) {
    console.error("usage: tsx scripts/seed-user.ts <email> <name> <password>");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { db, close } = await createConnection();

  await db.execute(sql`
    insert into users (email, name, password_hash)
    values (${email.toLowerCase()}, ${name}, ${passwordHash})
    on conflict (email) do update set name = excluded.name, password_hash = excluded.password_hash
  `);

  console.log(`Login ready: ${email}`);
  await close();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
