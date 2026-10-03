"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/server/auth";
import { field, mutationResult, positiveId, quantityValue, rejectInput, textField } from "@/lib/form";
import { categoryValue, supplyValue, unitValue } from "@/lib/validation";
import { findIngredientByName } from "@/db/ingredients";
import type { Supply } from "@/lib/supply";

/** Edit an ingredient's aisle and how often it gets bought. */
export async function updateIngredient(ingredientId: number, formData: FormData) {
  await requireUser();
  const result = await mutationResult(async () => {
    positiveId(ingredientId, "Ingredient");
    const supply = supplyValue(field(formData, "supply"));
    const category = categoryValue(field(formData, "category"));
    const db = await getDb();
    const updated = await db.update(schema.ingredients).set({ supply, category, ...(supply === "weekly" ? {} : { weeklyQuantity: null, weeklyUnit: null }) }).where(eq(schema.ingredients.id, ingredientId)).returning({ id: schema.ingredients.id });
    if (!updated.length) rejectInput("Ingredient no longer exists.");
  });
  if (!result.error) revalidatePath("/pantry");
  return result;
}

export async function createIngredient(formData: FormData) {
  await requireUser();
  const result = await mutationResult(async () => {
    const name = textField(formData, "name", "Ingredient name", 200, true);
    const category = categoryValue(field(formData, "category"));
    const supply = supplyValue(field(formData, "supply"));
    const db = await getDb();
    if (await findIngredientByName(db, name)) rejectInput("That ingredient already exists.");
    await db.insert(schema.ingredients).values({ name, category, supply });
  });
  if (!result.error) revalidatePath("/pantry");
  return result;
}

async function addToList(formData: FormData, supply: Supply) {
  await requireUser();
  const result = await mutationResult(async () => {
    const name = textField(formData, "name", "Item name", 200, true);
    const category = categoryValue(field(formData, "category"));
    const weeklyQuantity = quantityValue(field(formData, "quantity"), "Weekly quantity", 2);
    const weeklyUnit = unitValue(field(formData, "unit"));
    if (supply === "pantry" && (weeklyQuantity || weeklyUnit)) rejectInput("Pantry items do not have a weekly amount.");
    const db = await getDb();
    const existingId = await findIngredientByName(db, name);
    const values = { supply, weeklyQuantity, weeklyUnit };
    if (existingId) {
      await db.update(schema.ingredients).set(category !== "other" ? { ...values, category } : values).where(eq(schema.ingredients.id, existingId));
    } else {
      await db.insert(schema.ingredients).values({ name, category, ...values });
    }
  });
  if (!result.error) revalidatePath("/pantry");
  return result;
}

export async function addWeeklyItem(formData: FormData) {
  return addToList(formData, "weekly");
}

export async function addPantryItem(formData: FormData) {
  return addToList(formData, "pantry");
}

export async function setSupply(ingredientId: number, supply: Supply) {
  await requireUser();
  const result = await mutationResult(async () => {
    positiveId(ingredientId, "Ingredient");
    supplyValue(supply);
    const db = await getDb();
    const updated = await db.update(schema.ingredients).set(supply === "weekly" ? { supply } : { supply, weeklyQuantity: null, weeklyUnit: null }).where(eq(schema.ingredients.id, ingredientId)).returning({ id: schema.ingredients.id });
    if (!updated.length) rejectInput("Ingredient no longer exists.");
  });
  if (!result.error) revalidatePath("/pantry");
  return result;
}

export async function updateWeeklyAmount(ingredientId: number, formData: FormData) {
  await requireUser();
  const result = await mutationResult(async () => {
    positiveId(ingredientId, "Ingredient");
    const weeklyQuantity = quantityValue(field(formData, "quantity"), "Weekly quantity", 2);
    const weeklyUnit = unitValue(field(formData, "unit"));
    const db = await getDb();
    const updated = await db.update(schema.ingredients).set({ weeklyQuantity, weeklyUnit }).where(and(eq(schema.ingredients.id, ingredientId), eq(schema.ingredients.supply, "weekly"))).returning({ id: schema.ingredients.id });
    if (!updated.length) rejectInput("Choose an existing every-week ingredient.");
  });
  if (!result.error) revalidatePath("/pantry");
  return result;
}

/** Only allowed when nothing references it. */
export async function deleteIngredient(ingredientId: number) {
  await requireUser();
  const result = await mutationResult(async () => {
    positiveId(ingredientId, "Ingredient");
    const db = await getDb();
    const [used] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.recipeIngredients).where(eq(schema.recipeIngredients.ingredientId, ingredientId));
    if (used.count > 0) rejectInput("This ingredient is used in a recipe and cannot be deleted.");
    const deleted = await db.delete(schema.ingredients).where(eq(schema.ingredients.id, ingredientId)).returning({ id: schema.ingredients.id });
    if (!deleted.length) rejectInput("Ingredient no longer exists.");
  });
  if (!result.error) revalidatePath("/pantry");
  return result;
}
