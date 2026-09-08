import "server-only";

import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";

/** Everyone in the household, oldest account first. */
export async function listMembers() {
  const db = await getDb();
  return db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .orderBy(asc(schema.users.id));
}
