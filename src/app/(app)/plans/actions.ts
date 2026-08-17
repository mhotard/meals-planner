"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { isValidWeekStart, parseISODate, weekStartOf } from "@/lib/dates";
import { newShareToken } from "@/lib/plans";
import { isCategory } from "@/lib/categories";
import { normalizeUnit } from "@/lib/units";

async function planIdForWeek(weekStart: string): Promise<number | null> {
  const db = await getDb();
  const [plan] = await db
    .select({ id: schema.mealPlans.id })
    .from(schema.mealPlans)
    .where(eq(schema.mealPlans.weekStart, weekStart))
    .limit(1);
  return plan?.id ?? null;
}

export async function createPlan(weekStart: string) {
  const me = await requireUser();
  if (!isValidWeekStart(weekStart)) return;

  const db = await getDb();
  const existing = await planIdForWeek(weekStart);
  if (!existing) {
    await db.insert(schema.mealPlans).values({
      weekStart,
      shareToken: newShareToken(),
      createdBy: me.id,
    });
  }

  revalidatePath("/plans");
  redirect(`/plans/${weekStart}`);
}

/** "Plan the week containing this date" — snaps any date to its Monday. */
export async function createPlanForDate(formData: FormData) {
  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  await createPlan(weekStartOf(parseISODate(date)));
}

async function addEntry(
  weekStart: string,
  dayOfWeek: number,
  entry: { recipeId?: number; customLabel?: string },
) {
  await requireUser();
  const planId = await planIdForWeek(weekStart);
  if (!planId) return;
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) return;
  if (!entry.recipeId && !entry.customLabel) return;

  const db = await getDb();
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(sort_order), -1)::int + 1` })
    .from(schema.mealPlanEntries)
    .where(
      and(
        eq(schema.mealPlanEntries.planId, planId),
        eq(schema.mealPlanEntries.dayOfWeek, dayOfWeek),
      ),
    );

  await db.insert(schema.mealPlanEntries).values({
    planId,
    dayOfWeek,
    recipeId: entry.recipeId ?? null,
    customLabel: entry.customLabel ?? null,
    sortOrder: next,
  });

  revalidatePath(`/plans/${weekStart}`);
  revalidatePath(`/plans/${weekStart}/shopping`);
}

export async function addRecipeToDay(
  weekStart: string,
  dayOfWeek: number,
  recipeId: number,
) {
  await addEntry(weekStart, dayOfWeek, { recipeId });
}

export async function addCustomToDay(
  weekStart: string,
  dayOfWeek: number,
  label: string,
) {
  const customLabel = label.trim();
  if (!customLabel) return;
  await addEntry(weekStart, dayOfWeek, { customLabel });
}

export async function removePlanEntry(weekStart: string, entryId: number) {
  await requireUser();
  const db = await getDb();
  await db.delete(schema.mealPlanEntries).where(eq(schema.mealPlanEntries.id, entryId));
  revalidatePath(`/plans/${weekStart}`);
}

export async function updatePlanNotes(weekStart: string, formData: FormData) {
  await requireUser();
  const planId = await planIdForWeek(weekStart);
  if (!planId) return;

  const db = await getDb();
  await db
    .update(schema.mealPlans)
    .set({ notes: String(formData.get("notes") ?? "").trim() || null })
    .where(eq(schema.mealPlans.id, planId));
  revalidatePath(`/plans/${weekStart}`);
}

export async function deletePlan(weekStart: string) {
  await requireUser();
  const planId = await planIdForWeek(weekStart);
  if (!planId) return;

  const db = await getDb();
  await db.delete(schema.mealPlans).where(eq(schema.mealPlans.id, planId));
  revalidatePath("/plans");
  redirect("/plans");
}

/** Log every recipe in the week as cooked on its planned day. */
export async function logWeekAsCooked(weekStart: string) {
  const me = await requireUser();
  const planId = await planIdForWeek(weekStart);
  if (!planId) return;

  const db = await getDb();
  const entries = await db
    .select({
      recipeId: schema.mealPlanEntries.recipeId,
      dayOfWeek: schema.mealPlanEntries.dayOfWeek,
    })
    .from(schema.mealPlanEntries)
    .where(eq(schema.mealPlanEntries.planId, planId));

  for (const entry of entries) {
    if (entry.recipeId == null) continue;
    const cookedOn = new Date(weekStart);
    cookedOn.setDate(cookedOn.getDate() + entry.dayOfWeek);
    await db.insert(schema.cookLogs).values({
      recipeId: entry.recipeId,
      cookedOn: cookedOn.toISOString().slice(0, 10),
      userId: me.id,
    });
  }

  revalidatePath("/recipes");
  revalidatePath(`/plans/${weekStart}`);
}

// --- shopping list --------------------------------------------------------

async function setItemState(
  weekStart: string,
  itemKey: string,
  patch: { checked?: boolean; excluded?: boolean },
) {
  await requireUser();
  const planId = await planIdForWeek(weekStart);
  if (!planId) return;

  const db = await getDb();
  await db
    .insert(schema.planItemStates)
    .values({
      planId,
      itemKey,
      checked: patch.checked ?? false,
      excluded: patch.excluded ?? false,
    })
    .onConflictDoUpdate({
      target: [schema.planItemStates.planId, schema.planItemStates.itemKey],
      set: patch,
    });

  revalidatePath(`/plans/${weekStart}/shopping`);
}

export async function toggleItemChecked(
  weekStart: string,
  itemKey: string,
  checked: boolean,
) {
  await setItemState(weekStart, itemKey, { checked });
}

export async function toggleItemExcluded(
  weekStart: string,
  itemKey: string,
  excluded: boolean,
) {
  await setItemState(weekStart, itemKey, { excluded });
}

export async function addExtraItem(weekStart: string, formData: FormData) {
  await requireUser();
  const planId = await planIdForWeek(weekStart);
  if (!planId) return;

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;

  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const quantity = Number(quantityRaw);
  const category = String(formData.get("category") ?? "other");

  const db = await getDb();
  await db.insert(schema.planExtraItems).values({
    planId,
    label,
    quantity: quantityRaw && Number.isFinite(quantity) ? String(quantity) : null,
    unit: normalizeUnit(String(formData.get("unit") ?? "")) || null,
    category: isCategory(category) ? category : "other",
  });

  revalidatePath(`/plans/${weekStart}/shopping`);
}

export async function removeExtraItem(weekStart: string, extraId: number) {
  await requireUser();
  const db = await getDb();
  await db.delete(schema.planExtraItems).where(eq(schema.planExtraItems.id, extraId));
  revalidatePath(`/plans/${weekStart}/shopping`);
}

export async function clearCheckedItems(weekStart: string) {
  await requireUser();
  const planId = await planIdForWeek(weekStart);
  if (!planId) return;

  const db = await getDb();
  await db
    .update(schema.planItemStates)
    .set({ checked: false })
    .where(eq(schema.planItemStates.planId, planId));
  revalidatePath(`/plans/${weekStart}/shopping`);
}
