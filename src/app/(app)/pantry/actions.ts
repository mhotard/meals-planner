"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { isCategory } from "@/lib/categories";
import { toSupply, type Supply } from "@/lib/supply";
import { normalizeUnit } from "@/lib/units";

/** Edit an ingredient's aisle and how often it gets bought. */
export async function updateIngredient(ingredientId: number, formData: FormData) {
  await requireUser();
  const db = await getDb();

  const category = String(formData.get("category") ?? "other");

  await db
    .update(schema.ingredients)
    .set({
      supply: toSupply(formData.get("supply")),
      category: isCategory(category) ? category : "other",
    })
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
    supply: toSupply(formData.get("supply")),
  });

  revalidatePath("/pantry");
}

/**
 * Add an item to one of the two managed lists. Reuses the ingredient if a
 * recipe already mentions it, so lists and recipe lines stay the same thing.
 */
async function addToList(formData: FormData, supply: Supply) {
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
    supply,
    weeklyQuantity:
      supply === "weekly" && quantityRaw && Number.isFinite(quantity)
        ? String(quantity)
        : null,
    weeklyUnit:
      supply === "weekly"
        ? normalizeUnit(String(formData.get("unit") ?? "")) || null
        : null,
  };

  if (existing) {
    // Only apply the aisle when one was actually chosen, so promoting an
    // already-categorised ingredient doesn't reset it to "other".
    await db
      .update(schema.ingredients)
      .set(
        isCategory(category) && category !== "other" ? { ...values, category } : values,
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

export async function addWeeklyItem(formData: FormData) {
  await addToList(formData, "weekly");
}

export async function addPantryItem(formData: FormData) {
  await addToList(formData, "pantry");
}

/** Keeps the ingredient (recipes may use it) but takes it off the list. */
export async function setSupply(ingredientId: number, supply: Supply) {
  await requireUser();
  const db = await getDb();
  await db
    .update(schema.ingredients)
    .set(
      supply === "weekly"
        ? { supply }
        : { supply, weeklyQuantity: null, weeklyUnit: null },
    )
    .where(eq(schema.ingredients.id, ingredientId));
  revalidatePath("/pantry");
}

export async function updateWeeklyAmount(ingredientId: number, formData: FormData) {
  await requireUser();
  const db = await getDb();

  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const quantity = Number(quantityRaw);

  await db
    .update(schema.ingredients)
    .set({
      weeklyQuantity:
        quantityRaw && Number.isFinite(quantity) ? String(quantity) : null,
      weeklyUnit: normalizeUnit(String(formData.get("unit") ?? "")) || null,
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
