"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/server/auth";
import { field, numericOrNull, optionalField, parseQuantity } from "@/lib/form";
import { findOrCreateIngredient } from "@/db/ingredients";
import { normalizeUnit } from "@/lib/units";

export type RecipeFormState = { error?: string };

/** Ingredient rows arrive as parallel arrays from the dynamic form. */
function parseIngredientRows(formData: FormData) {
  const names = formData.getAll("ing-name").map(String);
  const quantities = formData.getAll("ing-quantity").map(String);
  const units = formData.getAll("ing-unit").map(String);
  const notes = formData.getAll("ing-note").map(String);

  return names
    .map((name, i) => ({
      name: name.trim(),
      quantity: numericOrNull(quantities[i] ?? ""),
      unit: normalizeUnit(units[i]) || null,
      note: notes[i]?.trim() || null,
    }))
    .filter((row) => row.name.length > 0);
}

async function writeRecipe(formData: FormData, recipeId?: number) {
  const name = field(formData, "name");
  if (!name) return { error: "Give the recipe a name." };

  const values = {
    name,
    description: optionalField(formData, "description"),
    notes: optionalField(formData, "notes"),
    sourceUrl: optionalField(formData, "sourceUrl"),
    servings: parseQuantity(field(formData, "servings")),
    prepMinutes: parseQuantity(field(formData, "prepMinutes")),
    updatedAt: new Date(),
  };

  const db = await getDb();
  const rows = parseIngredientRows(formData);

  let id = recipeId;
  if (id) {
    await db.update(schema.recipes).set(values).where(eq(schema.recipes.id, id));
    await db
      .delete(schema.recipeIngredients)
      .where(eq(schema.recipeIngredients.recipeId, id));
  } else {
    const [created] = await db
      .insert(schema.recipes)
      .values(values)
      .returning({ id: schema.recipes.id });
    id = created.id;
  }

  for (const [i, row] of rows.entries()) {
    await db.insert(schema.recipeIngredients).values({
      recipeId: id,
      ingredientId: await findOrCreateIngredient(db, row.name),
      quantity: row.quantity,
      unit: row.unit,
      note: row.note,
      sortOrder: i,
    });
  }

  return { id };
}

export async function createRecipe(
  _prev: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  await requireUser();
  const result = await writeRecipe(formData);
  if ("error" in result) return result;

  revalidatePath("/recipes");
  redirect(`/recipes/${result.id}`);
}

export async function updateRecipe(
  recipeId: number,
  _prev: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  await requireUser();
  const result = await writeRecipe(formData, recipeId);
  if ("error" in result) return result;

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
  redirect(`/recipes/${recipeId}`);
}

export async function deleteRecipe(recipeId: number) {
  await requireUser();
  const db = await getDb();
  await db.delete(schema.recipes).where(eq(schema.recipes.id, recipeId));
  revalidatePath("/recipes");
  redirect("/recipes");
}

export async function logCooked(recipeId: number, formData: FormData) {
  const me = await requireUser();
  const db = await getDb();

  const rating = field(formData, "rating");
  await db.insert(schema.cookLogs).values({
    recipeId,
    cookedOn: field(formData, "cookedOn") || new Date().toISOString().slice(0, 10),
    userId: me.id,
    rating: rating ? Number(rating) : null,
    note: optionalField(formData, "note"),
  });

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/recipes");
  revalidatePath("/");
}

export async function deleteCookLog(logId: number, recipeId: number) {
  await requireUser();
  const db = await getDb();
  await db.delete(schema.cookLogs).where(eq(schema.cookLogs.id, logId));
  revalidatePath(`/recipes/${recipeId}`);
}

export async function updateRecipeNotes(recipeId: number, formData: FormData) {
  await requireUser();
  const db = await getDb();
  await db
    .update(schema.recipes)
    .set({ notes: optionalField(formData, "notes"), updatedAt: new Date() })
    .where(eq(schema.recipes.id, recipeId));
  revalidatePath(`/recipes/${recipeId}`);
}
