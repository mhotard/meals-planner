"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { isCategory } from "@/lib/categories";
import { normalizeUnit } from "@/lib/units";

export async function updateIngredient(ingredientId: number, formData: FormData) {
  await requireUser();
  const db = await getDb();

  const category = String(formData.get("category") ?? "other");
  const quantityRaw = String(formData.get("stapleQuantity") ?? "").trim();
  const quantity = Number(quantityRaw);

  await db
    .update(schema.ingredients)
    .set({
      isStaple: formData.get("isStaple") === "on",
      category: isCategory(category) ? category : "other",
      stapleQuantity:
        quantityRaw && Number.isFinite(quantity) ? String(quantity) : null,
      stapleUnit: normalizeUnit(String(formData.get("stapleUnit") ?? "")) || null,
    })
    .where(eq(schema.ingredients.id, ingredientId));

  revalidatePath("/pantry");
}

export async function toggleStaple(ingredientId: number, next: boolean) {
  await requireUser();
  const db = await getDb();
  await db
    .update(schema.ingredients)
    .set({ isStaple: next })
    .where(eq(schema.ingredients.id, ingredientId));
  revalidatePath("/pantry");
}

export async function createIngredient(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const category = String(formData.get("category") ?? "other");
  const db = await getDb();

  const [existing] = await db
    .select({ id: schema.ingredients.id })
    .from(schema.ingredients)
    .where(sql`lower(${schema.ingredients.name}) = ${name.toLowerCase()}`)
    .limit(1);
  if (existing) return;

  await db.insert(schema.ingredients).values({
    name,
    category: isCategory(category) ? category : "other",
    isStaple: formData.get("isStaple") === "on",
  });

  revalidatePath("/pantry");
}

/**
 * Add an item to the "every week" list. Reuses the ingredient if a recipe
 * already mentions it, so staples and recipe lines stay the same thing.
 */
export async function addStaple(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const quantity = Number(quantityRaw);
  const category = String(formData.get("category") ?? "other");
  const db = await getDb();

  const [existing] = await db
    .select({ id: schema.ingredients.id })
    .from(schema.ingredients)
    .where(sql`lower(${schema.ingredients.name}) = ${name.toLowerCase()}`)
    .limit(1);

  const values = {
    isStaple: true,
    stapleQuantity: quantityRaw && Number.isFinite(quantity) ? String(quantity) : null,
    stapleUnit: normalizeUnit(String(formData.get("unit") ?? "")) || null,
  };

  if (existing) {
    // Only apply the aisle when one was actually chosen, so promoting an
    // already-categorised ingredient doesn't reset it to "other".
    await db
      .update(schema.ingredients)
      .set(
        isCategory(category) && category !== "other"
          ? { ...values, category }
          : values,
      )
      .where(eq(schema.ingredients.id, existing.id));
  } else {
    await db.insert(schema.ingredients).values({
      name,
      category: isCategory(category) ? category : "other",
      ...values,
    });
  }

  revalidatePath("/pantry");
}

/** Keeps the ingredient (recipes may use it) but drops it off every week. */
export async function removeStaple(ingredientId: number) {
  await requireUser();
  const db = await getDb();
  await db
    .update(schema.ingredients)
    .set({ isStaple: false, stapleQuantity: null, stapleUnit: null })
    .where(eq(schema.ingredients.id, ingredientId));
  revalidatePath("/pantry");
}

export async function updateStapleAmount(ingredientId: number, formData: FormData) {
  await requireUser();
  const db = await getDb();

  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const quantity = Number(quantityRaw);

  await db
    .update(schema.ingredients)
    .set({
      stapleQuantity:
        quantityRaw && Number.isFinite(quantity) ? String(quantity) : null,
      stapleUnit: normalizeUnit(String(formData.get("unit") ?? "")) || null,
    })
    .where(eq(schema.ingredients.id, ingredientId));

  revalidatePath("/pantry");
}

/** Only allowed when nothing references it. */
export async function deleteIngredient(ingredientId: number) {
  await requireUser();
  const db = await getDb();

  const [used] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.recipeIngredients)
    .where(eq(schema.recipeIngredients.ingredientId, ingredientId));
  if (used.count > 0) return;

  await db.delete(schema.ingredients).where(eq(schema.ingredients.id, ingredientId));
  revalidatePath("/pantry");
}
