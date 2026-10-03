"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/server/auth";
import { toCategory } from "@/lib/categories";
import { field, numericOrNull } from "@/lib/form";
import { findIngredientByName } from "@/db/ingredients";
import { toSupply, type Supply } from "@/lib/supply";
import { normalizeUnit } from "@/lib/units";

/** Edit an ingredient's aisle and how often it gets bought. */
export async function updateIngredient(ingredientId: number, formData: FormData) {
  await requireUser();
  const db = await getDb();

  await db
    .update(schema.ingredients)
    .set({
      supply: toSupply(formData.get("supply")),
      category: toCategory(formData.get("category")),
    })
    .where(eq(schema.ingredients.id, ingredientId));

  revalidatePath("/pantry");
}

export async function createIngredient(formData: FormData) {
  await requireUser();
  const name = field(formData, "name");
  if (!name) return;

  const db = await getDb();
  if (await findIngredientByName(db, name)) return;

  await db.insert(schema.ingredients).values({
    name,
    category: toCategory(formData.get("category")),
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
  const name = field(formData, "name");
  if (!name) return;

  const category = toCategory(formData.get("category"));
  const db = await getDb();
  const existingId = await findIngredientByName(db, name);

  const values = {
    supply,
    weeklyQuantity: supply === "weekly" ? numericOrNull(field(formData, "quantity")) : null,
    weeklyUnit: supply === "weekly" ? normalizeUnit(field(formData, "unit")) || null : null,
  };

  if (existingId) {
    // Only apply the aisle when one was actually chosen, so promoting an
    // already-categorised ingredient doesn't reset it to "other".
    await db
      .update(schema.ingredients)
      .set(category !== "other" ? { ...values, category } : values)
      .where(eq(schema.ingredients.id, existingId));
  } else {
    await db.insert(schema.ingredients).values({ name, category, ...values });
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

  await db
    .update(schema.ingredients)
    .set({
      weeklyQuantity: numericOrNull(field(formData, "quantity")),
      weeklyUnit: normalizeUnit(field(formData, "unit")) || null,
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
