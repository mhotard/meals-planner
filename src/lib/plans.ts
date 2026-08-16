import "server-only";

import { randomBytes } from "node:crypto";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export function newShareToken(): string {
  return randomBytes(12).toString("base64url");
}

export type PlanEntry = {
  id: number;
  dayOfWeek: number;
  recipeId: number | null;
  recipeName: string | null;
  customLabel: string | null;
  sortOrder: number;
};

export async function getPlanByWeek(weekStart: string) {
  const db = await getDb();
  const [plan] = await db
    .select()
    .from(schema.mealPlans)
    .where(eq(schema.mealPlans.weekStart, weekStart))
    .limit(1);
  return plan ?? null;
}

export async function getPlanByToken(token: string) {
  const db = await getDb();
  const [plan] = await db
    .select()
    .from(schema.mealPlans)
    .where(eq(schema.mealPlans.shareToken, token))
    .limit(1);
  return plan ?? null;
}

export async function getPlanEntries(planId: number): Promise<PlanEntry[]> {
  const db = await getDb();
  return db
    .select({
      id: schema.mealPlanEntries.id,
      dayOfWeek: schema.mealPlanEntries.dayOfWeek,
      recipeId: schema.mealPlanEntries.recipeId,
      recipeName: schema.recipes.name,
      customLabel: schema.mealPlanEntries.customLabel,
      sortOrder: schema.mealPlanEntries.sortOrder,
    })
    .from(schema.mealPlanEntries)
    .leftJoin(schema.recipes, eq(schema.recipes.id, schema.mealPlanEntries.recipeId))
    .where(eq(schema.mealPlanEntries.planId, planId))
    .orderBy(asc(schema.mealPlanEntries.dayOfWeek), asc(schema.mealPlanEntries.sortOrder));
}

export function groupByDay(entries: PlanEntry[]): PlanEntry[][] {
  const days: PlanEntry[][] = Array.from({ length: 7 }, () => []);
  for (const entry of entries) {
    if (entry.dayOfWeek >= 0 && entry.dayOfWeek < 7) days[entry.dayOfWeek].push(entry);
  }
  return days;
}

export async function listPlans() {
  const db = await getDb();
  const plans = await db
    .select({
      id: schema.mealPlans.id,
      weekStart: schema.mealPlans.weekStart,
      shareToken: schema.mealPlans.shareToken,
    })
    .from(schema.mealPlans)
    .orderBy(desc(schema.mealPlans.weekStart));

  const counts = await db
    .select({
      planId: schema.mealPlanEntries.planId,
      count: schema.mealPlanEntries.id,
    })
    .from(schema.mealPlanEntries);

  const byPlan = new Map<number, number>();
  for (const row of counts) {
    byPlan.set(row.planId, (byPlan.get(row.planId) ?? 0) + 1);
  }

  return plans.map((p) => ({ ...p, mealCount: byPlan.get(p.id) ?? 0 }));
}
