"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema, type DB } from "@/db";
import { requireUser, type SessionUser } from "@/lib/auth";
import { toCategory } from "@/lib/categories";
import { isValidWeekStart, parseISODate, weekStartOf } from "@/lib/dates";
import { field, numericOrNull, optionalField } from "@/lib/form";
import { newShareToken } from "@/lib/plans";
import { normalizeUnit } from "@/lib/units";

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
 * Does nothing when the week has no plan yet.
 */
async function withPlan(weekStart: string, fn: (ctx: PlanContext) => Promise<void>) {
  const me = await requireUser();
  const db = await getDb();
  const [plan] = await db
    .select({ id: schema.mealPlans.id })
    .from(schema.mealPlans)
    .where(eq(schema.mealPlans.weekStart, weekStart))
    .limit(1);
  if (!plan) return;

  await fn({ db, planId: plan.id, me });
  revalidateWeek(weekStart);
}

export async function createPlan(weekStart: string) {
  const me = await requireUser();
  if (!isValidWeekStart(weekStart)) return;

  const db = await getDb();
  await db
    .insert(schema.mealPlans)
    .values({ weekStart, shareToken: newShareToken(), createdBy: me.id })
    .onConflictDoNothing({ target: schema.mealPlans.weekStart });

  revalidateWeek(weekStart);
  redirect(`/plans/${weekStart}`);
}

/** "Plan the week containing this date" — snaps any date to its Monday. */
export async function createPlanForDate(formData: FormData) {
  const date = field(formData, "date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  await createPlan(weekStartOf(parseISODate(date)));
}

async function addEntry(
  weekStart: string,
  dayOfWeek: number,
  entry: { recipeId?: number; customLabel?: string },
) {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) return;
  if (!entry.recipeId && !entry.customLabel) return;

  await withPlan(weekStart, async ({ db, planId }) => {
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
  await addEntry(weekStart, dayOfWeek, { recipeId });
}

export async function addCustomToDay(weekStart: string, dayOfWeek: number, label: string) {
  const customLabel = label.trim();
  if (!customLabel) return;
  await addEntry(weekStart, dayOfWeek, { customLabel });
}

export async function removePlanEntry(weekStart: string, entryId: number) {
  await withPlan(weekStart, async ({ db, planId }) => {
    await db
      .delete(schema.mealPlanEntries)
      .where(
        and(eq(schema.mealPlanEntries.id, entryId), eq(schema.mealPlanEntries.planId, planId)),
      );
  });
}

export async function updatePlanNotes(weekStart: string, formData: FormData) {
  await withPlan(weekStart, async ({ db, planId }) => {
    await db
      .update(schema.mealPlans)
      .set({ notes: optionalField(formData, "notes") })
      .where(eq(schema.mealPlans.id, planId));
  });
}

export async function deletePlan(weekStart: string) {
  await withPlan(weekStart, async ({ db, planId }) => {
    await db.delete(schema.mealPlans).where(eq(schema.mealPlans.id, planId));
  });
  redirect("/plans");
}

/** Log every recipe in the week as cooked on its planned day. */
export async function logWeekAsCooked(weekStart: string) {
  await withPlan(weekStart, async ({ db, planId, me }) => {
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
  });
  revalidatePath("/recipes");
}

// --- shopping list --------------------------------------------------------

/** Check off or skip one computed line; the row is created on first touch. */
export async function setItemState(
  weekStart: string,
  itemKey: string,
  patch: { checked?: boolean; excluded?: boolean },
) {
  await withPlan(weekStart, async ({ db, planId }) => {
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
  const label = field(formData, "label");
  if (!label) return;

  await withPlan(weekStart, async ({ db, planId }) => {
    await db.insert(schema.planExtraItems).values({
      planId,
      label,
      quantity: numericOrNull(field(formData, "quantity")),
      unit: normalizeUnit(field(formData, "unit")) || null,
      category: toCategory(formData.get("category")),
    });
  });
}

export async function removeExtraItem(weekStart: string, extraId: number) {
  await withPlan(weekStart, async ({ db, planId }) => {
    await db
      .delete(schema.planExtraItems)
      .where(
        and(eq(schema.planExtraItems.id, extraId), eq(schema.planExtraItems.planId, planId)),
      );
  });
}

export async function clearCheckedItems(weekStart: string) {
  await withPlan(weekStart, async ({ db, planId }) => {
    await db
      .update(schema.planItemStates)
      .set({ checked: false })
      .where(eq(schema.planItemStates.planId, planId));
  });
}
