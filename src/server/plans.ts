import "server-only";

import { randomBytes } from "node:crypto";
import { asc, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { PlanEntry } from "@/lib/plans";

export function newShareToken(): string {
  return randomBytes(12).toString("base64url");
}

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

export async function listPlans() {
  const db = await getDb();
  return db
    .select({
      id: schema.mealPlans.id,
      weekStart: schema.mealPlans.weekStart,
      shareToken: schema.mealPlans.shareToken,
      // Literal SQL with an alias, for the same reason as in server/recipes.ts.
      mealCount: sql<number>`(
        select count(*)::int from meal_plan_entries e where e.plan_id = meal_plans.id
      )`,
    })
    .from(schema.mealPlans)
    .orderBy(desc(schema.mealPlans.weekStart));
}
