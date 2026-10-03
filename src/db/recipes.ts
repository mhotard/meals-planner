import { eq } from "drizzle-orm";
import { positiveId } from "@/lib/form";
import type { ValidatedRecipeInput } from "@/lib/validation";
import type { DB } from "./create";
import { findOrCreateIngredient } from "./ingredients";
import * as schema from "./schema";

export type RecipeSaveTarget = { kind: "create" } | { kind: "update"; recipeId: number };
export type RecipeSaveResult = { id: number } | { error: string };

/**
 * Accept the complete validated form, then commit recipe, canonical ingredients,
 * and replacement lines together. Request auth, cache work and redirects belong
 * to the caller; database errors propagate after Drizzle rolls the save back.
 */
export async function saveValidatedRecipe(
  db: DB,
  input: ValidatedRecipeInput,
  target: RecipeSaveTarget,
): Promise<RecipeSaveResult> {
  if (target.kind === "update") positiveId(target.recipeId, "Recipe");
  return db.transaction(async (tx) => {
    const { ingredients, ...recipe } = input;
    const values = { ...recipe, updatedAt: new Date() };
    let id: number;
    if (target.kind === "update") {
      // UPDATE locks the target through commit, avoiding a lookup/delete race.
      const [updated] = await tx.update(schema.recipes).set(values)
        .where(eq(schema.recipes.id, target.recipeId)).returning({ id: schema.recipes.id });
      if (!updated) return { error: "Recipe no longer exists." };
      id = updated.id;
      await tx.delete(schema.recipeIngredients).where(eq(schema.recipeIngredients.recipeId, id));
    } else {
      const [created] = await tx.insert(schema.recipes).values(values).returning({ id: schema.recipes.id });
      id = created.id;
    }

    // Stable ingredient lock ordering avoids inverted lock acquisition across
    // concurrent saves. Keep the first spelling and the original recipe order.
    const names = new Map<string, string>();
    for (const row of ingredients) {
      const key = row.name.trim().toLowerCase();
      if (!names.has(key)) names.set(key, row.name);
    }
    const ingredientIds = new Map<string, number>();
    for (const key of [...names.keys()].sort()) {
      ingredientIds.set(key, await findOrCreateIngredient(tx, names.get(key)!));
    }
    for (const [sortOrder, row] of ingredients.entries()) {
      await tx.insert(schema.recipeIngredients).values({
        recipeId: id,
        ingredientId: ingredientIds.get(row.name.trim().toLowerCase())!,
        quantity: row.quantity,
        unit: row.unit,
        note: row.note,
        sortOrder,
      });
    }
    return { id };
  }, { isolationLevel: "read committed" });
}
