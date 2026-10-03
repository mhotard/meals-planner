"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema, type DB } from "@/db";
import { requireUser, type SessionUser } from "@/server/auth";

import { addDays, parseISODate, weekStartOf } from "@/lib/dates";
import { field, mutationResult, optionalField, positiveId, quantityValue, rejectInput, textField, textValue } from "@/lib/form";
import type { MutationResult } from "@/lib/form";
import { categoryValue, dateValue, dayValue, itemKeyValue, itemStatePatch, unitValue, weekValue } from "@/lib/validation";
import { newShareToken } from "@/server/plans";
import { buildShoppingList } from "@/server/shopping";

type PlanContext = { db: DB; planId: number; me: SessionUser };

/** Every page that shows this week, so a change anywhere shows up everywhere. */
function revalidateWeek(weekStart: string) {
  revalidatePath(`/plans/${weekStart}`);
  revalidatePath(`/plans/${weekStart}/shopping`);
  revalidatePath("/plans");
  revalidatePath("/");
}

/**
 * Runs `fn` against the plan for `weekStart`, then revalidates the week.
 * Returns a visible error when the week has no plan yet.
 */
async function withPlan(weekStart: string, fn: (ctx: PlanContext) => Promise<void>): Promise<MutationResult> {
  const me = await requireUser();
  const result = await mutationResult(async () => {
    weekValue(weekStart);
    const db = await getDb();
    const [plan] = await db.select({ id: schema.mealPlans.id }).from(schema.mealPlans).where(eq(schema.mealPlans.weekStart, weekStart)).limit(1);
    if (!plan) rejectInput("This week has no plan yet.");
    await fn({ db, planId: plan.id, me });
  });
  if (!result.error) revalidateWeek(weekStart);
  return result;
}

export async function createPlan(weekStart: string) {
  const me = await requireUser();
  const result = await mutationResult(async () => {
    weekValue(weekStart);
    const db = await getDb();
    await db.insert(schema.mealPlans).values({ weekStart, shareToken: newShareToken(), createdBy: me.id }).onConflictDoNothing({ target: schema.mealPlans.weekStart });
  });
  if (result.error) return result;
  revalidateWeek(weekStart);
  redirect(`/plans/${weekStart}`);
}

/** "Plan the week containing this date" — snaps any date to its Monday. */
export async function createPlanForDate(formData: FormData) {
  await requireUser();
  let week = "";
  const result = await mutationResult(async () => {
    const date = dateValue(field(formData, "date"));
    week = weekStartOf(parseISODate(date));
    weekValue(week);
  });
  if (result.error) return result;
  return createPlan(week);
}

async function addEntry(
  weekStart: string,
  dayOfWeek: number,
  entry: { recipeId?: number; customLabel?: string },
) {
  return withPlan(weekStart, async ({ db, planId }) => {
    dayValue(dayOfWeek);
    if (entry.recipeId !== undefined) {
      positiveId(entry.recipeId, "Recipe");
      const [recipe] = await db.select({ id: schema.recipes.id }).from(schema.recipes).where(eq(schema.recipes.id, entry.recipeId));
      if (!recipe) rejectInput("Recipe no longer exists.");
    } else {
      entry.customLabel = textValue(entry.customLabel, "Meal label", 200, true);
    }
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
  });
}

export async function addRecipeToDay(weekStart: string, dayOfWeek: number, recipeId: number) {
  return addEntry(weekStart, dayOfWeek, { recipeId });
}

export async function addCustomToDay(weekStart: string, dayOfWeek: number, label: string) {
  return addEntry(weekStart, dayOfWeek, { customLabel: label });
}

export async function removePlanEntry(weekStart: string, entryId: number) {
  return withPlan(weekStart, async ({ db, planId }) => {
    positiveId(entryId, "Plan entry");
    const deleted = await db
      .delete(schema.mealPlanEntries)
      .where(
        and(eq(schema.mealPlanEntries.id, entryId), eq(schema.mealPlanEntries.planId, planId)),
      ).returning({ id: schema.mealPlanEntries.id });
    if (!deleted.length) rejectInput("Meal entry does not belong to this week.");
  });
}

export async function updatePlanNotes(weekStart: string, formData: FormData) {
  return withPlan(weekStart, async ({ db, planId }) => {
    const notes = optionalField(formData, "notes");
    await db
      .update(schema.mealPlans)
      .set({ notes })
      .where(eq(schema.mealPlans.id, planId));
  });
}

export async function deletePlan(weekStart: string) {
  const result = await withPlan(weekStart, async ({ db, planId }) => {
    await db.delete(schema.mealPlans).where(eq(schema.mealPlans.id, planId));
  });
  if (result.error) return result;
  redirect("/plans");
}

/** Log every recipe in the week as cooked on its planned day. */
export async function logWeekAsCooked(weekStart: string) {
  const result = await withPlan(weekStart, async ({ db, planId, me }) => {
    const entries = await db
      .select({
        recipeId: schema.mealPlanEntries.recipeId,
        dayOfWeek: schema.mealPlanEntries.dayOfWeek,
      })
      .from(schema.mealPlanEntries)
      .where(eq(schema.mealPlanEntries.planId, planId));

    const logs = entries.flatMap((entry) => {
      dayValue(entry.dayOfWeek);
      if (entry.recipeId == null) return [];
      positiveId(entry.recipeId, "Recipe");
      return [{ recipeId: entry.recipeId, cookedOn: dateValue(addDays(weekStart, entry.dayOfWeek), "Cook date"), userId: me.id }];
    });
    if (logs.length) await db.insert(schema.cookLogs).values(logs);
  });
  if (!result.error) revalidatePath("/recipes");
  return result;
}

// --- shopping list --------------------------------------------------------

/** Check off or skip one computed line; the row is created on first touch. */
export async function setItemState(
  weekStart: string,
  itemKey: string,
  patch: { checked?: boolean; excluded?: boolean },
) {
  return withPlan(weekStart, async ({ db, planId }) => {
    itemKey = itemKeyValue(itemKey);
    patch = itemStatePatch(patch);
    const items = await buildShoppingList(planId);
    if (!items.some((item) => item.key === itemKey)) rejectInput("Shopping item does not belong to this week.");
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
  });
}

export async function addExtraItem(weekStart: string, formData: FormData) {
  return withPlan(weekStart, async ({ db, planId }) => {
    const label = textField(formData, "label", "Item name", 200, true);
    const quantity = quantityValue(field(formData, "quantity"));
    const unit = unitValue(field(formData, "unit"));
    const category = categoryValue(field(formData, "category"));
    await db.insert(schema.planExtraItems).values({ planId, label, quantity, unit, category });
  });
}

export async function removeExtraItem(weekStart: string, extraId: number) {
  return withPlan(weekStart, async ({ db, planId }) => {
    positiveId(extraId, "Extra item");
    const deleted = await db
      .delete(schema.planExtraItems)
      .where(
        and(eq(schema.planExtraItems.id, extraId), eq(schema.planExtraItems.planId, planId)),
      ).returning({ id: schema.planExtraItems.id });
    if (!deleted.length) rejectInput("Extra item does not belong to this week.");
  });
}

export async function clearCheckedItems(weekStart: string) {
  return withPlan(weekStart, async ({ db, planId }) => {
    await db
      .update(schema.planItemStates)
      .set({ checked: false })
      .where(eq(schema.planItemStates.planId, planId));
  });
}
