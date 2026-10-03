"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/server/auth";
import { field, integerValue, mutationResult, optionalField, positiveId, rejectInput, validate } from "@/lib/form";
import { dateValue, validateRecipeInput } from "@/lib/validation";
import { findOrCreateIngredient } from "@/db/ingredients";


export type RecipeFormState = { error?: string };

async function writeRecipe(formData: FormData, recipeId?: number) {
  const input = validateRecipeInput(formData);
  if (!input.ok) return { error: input.error };
  if (recipeId !== undefined) {
    try { positiveId(recipeId, "Recipe"); } catch { return { error: "Recipe must be a positive ID." }; }
  }
  const { ingredients: rows, ...recipe } = input.value;
  const values = { ...recipe, updatedAt: new Date() };
  const db = await getDb();
  if (recipeId !== undefined) {
    const [existing] = await db.select({ id: schema.recipes.id }).from(schema.recipes).where(eq(schema.recipes.id, recipeId));
    if (!existing) return { error: "Recipe no longer exists." };
  }

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
  const id = validate(() => positiveId(recipeId, "Recipe"));
  if (!id.ok) return { error: id.error };
  const result = await writeRecipe(formData, id.value);
  if ("error" in result) return result;

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
  redirect(`/recipes/${recipeId}`);
}

export async function deleteRecipe(recipeId: number) {
  await requireUser();
  const result = await mutationResult(async () => {
    positiveId(recipeId, "Recipe");
    const db = await getDb();
    const deleted = await db.delete(schema.recipes).where(eq(schema.recipes.id, recipeId)).returning({ id: schema.recipes.id });
    if (!deleted.length) rejectInput("Recipe no longer exists.");
  });
  if (result.error) return result;
  revalidatePath("/recipes");
  redirect("/recipes");
}

export async function logCooked(recipeId: number, formData: FormData) {
  const me = await requireUser();
  const result = await mutationResult(async () => {
    positiveId(recipeId, "Recipe");
    const cookedOn = dateValue(field(formData, "cookedOn"), "Cook date");
    const rating = integerValue(field(formData, "rating"), "Rating", 1, 3);
    const note = optionalField(formData, "note", 2000);
    const db = await getDb();
    const [recipe] = await db.select({ id: schema.recipes.id }).from(schema.recipes).where(eq(schema.recipes.id, recipeId));
    if (!recipe) rejectInput("Recipe no longer exists.");
    await db.insert(schema.cookLogs).values({ recipeId, cookedOn, userId: me.id, rating, note });
  });
  if (result.error) return result;
  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/recipes");
  revalidatePath("/");
  return result;
}

export async function deleteCookLog(logId: number, recipeId: number) {
  await requireUser();
  const result = await mutationResult(async () => {
    positiveId(logId, "Cook log");
    positiveId(recipeId, "Recipe");
    const db = await getDb();
    const deleted = await db.delete(schema.cookLogs).where(and(eq(schema.cookLogs.id, logId), eq(schema.cookLogs.recipeId, recipeId))).returning({ id: schema.cookLogs.id });
    if (!deleted.length) rejectInput("Cook log does not belong to this recipe.");
  });
  if (!result.error) revalidatePath(`/recipes/${recipeId}`);
  return result;
}

export async function updateRecipeNotes(recipeId: number, formData: FormData) {
  await requireUser();
  const result = await mutationResult(async () => {
    positiveId(recipeId, "Recipe");
    const notes = optionalField(formData, "notes");
    const db = await getDb();
    const updated = await db.update(schema.recipes).set({ notes, updatedAt: new Date() }).where(eq(schema.recipes.id, recipeId)).returning({ id: schema.recipes.id });
    if (!updated.length) rejectInput("Recipe no longer exists.");
  });
  if (!result.error) revalidatePath(`/recipes/${recipeId}`);
  return result;
}
