"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { findOrCreateIngredient } from "@/lib/recipes";
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
      quantity: quantities[i]?.trim() ?? "",
      unit: normalizeUnit(units[i]),
      note: notes[i]?.trim() ?? "",
    }))
    .filter((row) => row.name.length > 0);
}

function parseNumber(value: string): number | null {
  if (!value) return null;
  // Accept "1 1/2" and "1/2" as well as plain decimals.
  const mixed = value.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = value.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function writeRecipe(formData: FormData, recipeId?: number) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the recipe a name." };

  const values = {
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    sourceUrl: String(formData.get("sourceUrl") ?? "").trim() || null,
    servings: parseNumber(String(formData.get("servings") ?? "")) ?? null,
    prepMinutes: parseNumber(String(formData.get("prepMinutes") ?? "")) ?? null,
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
    const ingredientId = await findOrCreateIngredient(db, row.name);
    const quantity = parseNumber(row.quantity);
    await db.insert(schema.recipeIngredients).values({
      recipeId: id,
      ingredientId,
      quantity: quantity == null ? null : String(quantity),
      unit: row.unit || null,
      note: row.note || null,
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

  const cookedOn =
    String(formData.get("cookedOn") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);
  const ratingRaw = String(formData.get("rating") ?? "").trim();

  await db.insert(schema.cookLogs).values({
    recipeId,
    cookedOn,
    userId: me.id,
    rating: ratingRaw ? Number(ratingRaw) : null,
    note: String(formData.get("note") ?? "").trim() || null,
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
    .set({
      notes: String(formData.get("notes") ?? "").trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(schema.recipes.id, recipeId));
  revalidatePath(`/recipes/${recipeId}`);
}
