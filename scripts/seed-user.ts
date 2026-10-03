/**
 * Create or update a login.
 *   npx tsx scripts/seed-user.ts <email> <name> <password>
 * Works against PGlite locally, or Postgres when DATABASE_URL is set.
 */
import "./env";
import bcrypt from "bcryptjs";
import { upsertLogin } from "../src/db/auth";
import { memberName, normalizeEmail, passwordError } from "../src/lib/auth-input";
import { createConnection } from "../src/db/create";

async function main() {
  const [rawEmail, rawName, password] = process.argv.slice(2);
  const email = normalizeEmail(rawEmail);
  const name = memberName(rawName);
  const invalid = passwordError(password);
  if (!email || !name || invalid) {
    console.error("usage: tsx scripts/seed-user.ts <email> <name> <password>");
    if (invalid) console.error(invalid);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { db, close } = await createConnection();

  try {
    await upsertLogin(db, email, name, passwordHash);
    console.log("Login ready; previous sessions revoked on reset.");
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
