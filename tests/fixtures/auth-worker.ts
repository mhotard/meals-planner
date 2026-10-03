/** Independent disposable-database process for the durable limiter regression. */
import { createConnection } from "../../src/db/create";
import { authenticatePassword } from "../../src/db/auth";
async function main() {
const connection = await createConnection();
try {
  const user = await authenticatePassword(connection.db, process.env.AUTH_TEST_EMAIL!, process.env.AUTH_TEST_PASSWORD!, new Date(process.env.AUTH_TEST_TIME!));
  // Only the boolean outcome is emitted, never a session or credentials.
  console.log(user ? "authenticated" : "rejected");
} finally {
  await connection.close();
}

}
main().catch(() => { console.error("Auth test worker failed"); process.exitCode = 1; });
