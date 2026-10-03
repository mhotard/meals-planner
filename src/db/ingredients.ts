import { sql } from "drizzle-orm";
import type { DB } from "./create";
import * as schema from "./schema";

/** Shared query surface implemented by both a connection and its transaction. */
export type IngredientQueries = Pick<DB, "select" | "insert">;

/**
 * Ingredient names are unique case-insensitively (see the index in the
 * schema), so every lookup goes through here. Takes the db as a parameter so
 * the seed script can use it too.
 */
export async function findIngredientByName(db: IngredientQueries, rawName: string): Promise<number | null> {
  const name = rawName.trim();
  const [existing] = await db
    .select({ id: schema.ingredients.id })
    .from(schema.ingredients)
    .where(sql`lower(${schema.ingredients.name}) = lower(${name})`)
    .limit(1);
  return existing?.id ?? null;
}

export async function findOrCreateIngredient(db: IngredientQueries, rawName: string): Promise<number> {
  const name = rawName.trim();
  // The unique lower(name) index arbitrates concurrent attempts. Drizzle's
  // conflict-target API accepts columns only, so DO NOTHING lets that index
  // reject duplicate names without aborting the surrounding transaction.
  const [created] = await db
    .insert(schema.ingredients)
    .values({ name })
    .onConflictDoNothing()
    .returning({ id: schema.ingredients.id });
  if (created) return created.id;

  // At READ COMMITTED the next statement sees the winning committed row.
  // Keep its original spelling, category, supply and weekly purchasing amount.
  const existing = await findIngredientByName(db, name);
  if (existing === null) throw new Error("Ingredient changed while saving. Try again.");
  return existing;
}
