import { sql } from "drizzle-orm";
import type { DB } from "@/db";
import * as schema from "@/db/schema";

/**
 * Ingredient names are unique case-insensitively (see the index in the
 * schema), so every lookup goes through here. Takes the db as a parameter so
 * the seed script can use it too.
 */
export async function findIngredientByName(db: DB, rawName: string): Promise<number | null> {
  const name = rawName.trim().toLowerCase();
  const [existing] = await db
    .select({ id: schema.ingredients.id })
    .from(schema.ingredients)
    .where(sql`lower(${schema.ingredients.name}) = ${name}`)
    .limit(1);
  return existing?.id ?? null;
}

export async function findOrCreateIngredient(db: DB, rawName: string): Promise<number> {
  const name = rawName.trim();
  const existing = await findIngredientByName(db, name);
  if (existing) return existing;

  const [created] = await db
    .insert(schema.ingredients)
    .values({ name })
    .returning({ id: schema.ingredients.id });
  return created.id;
}
