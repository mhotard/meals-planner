import "server-only";

import { eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { categoryRank } from "./categories";
import { formatAmount, formatQuantity, fromBase, toBase, unitGroupKey } from "./units";

export type ShoppingItem = {
  /** Stable across rebuilds so check/exclude state sticks to the right line. */
  key: string;
  name: string;
  category: string;
  amount: string;
  /** Which recipes drove this line, for the "why is this here?" hint. */
  fromRecipes: string[];
  isStaple: boolean;
  isExtra: boolean;
  checked: boolean;
  excluded: boolean;
};

type Accumulator = {
  name: string;
  category: string;
  isStaple: boolean;
  base: number | null;
  unitsSeen: string[];
  fromRecipes: Set<string>;
};

/**
 * Builds the week's list: every ingredient from the planned recipes, combined
 * across recipes where the units allow it, plus the weekly staples, plus any
 * ad-hoc items typed in for this week.
 */
export async function buildShoppingList(planId: number): Promise<ShoppingItem[]> {
  const db = await getDb();

  const entries = await db
    .select({ recipeId: schema.mealPlanEntries.recipeId })
    .from(schema.mealPlanEntries)
    .where(eq(schema.mealPlanEntries.planId, planId));

  const recipeIds = [...new Set(entries.map((e) => e.recipeId).filter((id): id is number => id != null))];

  const lines = recipeIds.length
    ? await db
        .select({
          recipeName: schema.recipes.name,
          ingredientId: schema.ingredients.id,
          name: schema.ingredients.name,
          category: schema.ingredients.category,
          isStaple: schema.ingredients.isStaple,
          quantity: schema.recipeIngredients.quantity,
          unit: schema.recipeIngredients.unit,
        })
        .from(schema.recipeIngredients)
        .innerJoin(
          schema.ingredients,
          eq(schema.ingredients.id, schema.recipeIngredients.ingredientId),
        )
        .innerJoin(schema.recipes, eq(schema.recipes.id, schema.recipeIngredients.recipeId))
        .where(inArray(schema.recipeIngredients.recipeId, recipeIds))
    : [];

  const groups = new Map<string, Accumulator>();

  function accumulate(
    key: string,
    seed: Omit<Accumulator, "base" | "unitsSeen" | "fromRecipes">,
    quantity: number | null,
    unit: string | null,
    recipeName?: string,
  ) {
    const existing = groups.get(key);
    const acc: Accumulator = existing ?? {
      ...seed,
      base: null,
      unitsSeen: [],
      fromRecipes: new Set<string>(),
    };
    if (quantity != null) {
      acc.base = (acc.base ?? 0) + toBase(quantity, unit);
      acc.unitsSeen.push(unit ?? "");
    }
    if (recipeName) acc.fromRecipes.add(recipeName);
    groups.set(key, acc);
  }

  for (const line of lines) {
    const quantity = line.quantity == null ? null : Number(line.quantity);
    const key = `ing:${line.ingredientId}:${unitGroupKey(line.unit)}`;
    accumulate(
      key,
      { name: line.name, category: line.category, isStaple: line.isStaple },
      quantity,
      line.unit,
      line.recipeName,
    );
  }

  // Weekly staples are on the list whether or not a recipe called for them.
  const staples = await db
    .select()
    .from(schema.ingredients)
    .where(eq(schema.ingredients.isStaple, true));

  for (const staple of staples) {
    const quantity = staple.stapleQuantity == null ? null : Number(staple.stapleQuantity);
    const key = `ing:${staple.id}:${unitGroupKey(staple.stapleUnit)}`;
    const existing = groups.get(key);

    if (!existing) {
      accumulate(
        key,
        { name: staple.name, category: staple.category, isStaple: true },
        quantity,
        staple.stapleUnit,
      );
      continue;
    }

    // The recipes already need some of this. Buy the usual weekly amount, or
    // the recipes' total if that's more — never less than either.
    existing.isStaple = true;
    if (quantity != null) {
      const stapleBase = toBase(quantity, staple.stapleUnit);
      if (existing.base == null || stapleBase > existing.base) {
        existing.base = stapleBase;
        existing.unitsSeen.push(staple.stapleUnit ?? "");
      }
    }
  }

  const extras = await db
    .select()
    .from(schema.planExtraItems)
    .where(eq(schema.planExtraItems.planId, planId));

  const states = await db
    .select()
    .from(schema.planItemStates)
    .where(eq(schema.planItemStates.planId, planId));
  const stateByKey = new Map(states.map((s) => [s.itemKey, s]));

  const items: ShoppingItem[] = [];

  for (const [key, acc] of groups) {
    const state = stateByKey.get(key);
    const amount =
      acc.base == null
        ? ""
        : (() => {
            const { quantity, unit } = fromBase(acc.base, acc.unitsSeen);
            return formatAmount(quantity, unit);
          })();

    items.push({
      key,
      name: acc.name,
      category: acc.category,
      amount,
      fromRecipes: [...acc.fromRecipes],
      isStaple: acc.isStaple,
      isExtra: false,
      checked: state?.checked ?? false,
      excluded: state?.excluded ?? false,
    });
  }

  for (const extra of extras) {
    const key = `extra:${extra.id}`;
    const state = stateByKey.get(key);
    items.push({
      key,
      name: extra.label,
      category: extra.category,
      amount: formatAmount(
        extra.quantity == null ? null : Number(extra.quantity),
        extra.unit,
      ),
      fromRecipes: [],
      isStaple: false,
      isExtra: true,
      checked: state?.checked ?? false,
      excluded: state?.excluded ?? false,
    });
  }

  return items.sort(
    (a, b) =>
      categoryRank(a.category) - categoryRank(b.category) ||
      a.name.localeCompare(b.name),
  );
}

export function groupByCategory(items: ShoppingItem[]) {
  const map = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return [...map.entries()].sort(([a], [b]) => categoryRank(a) - categoryRank(b));
}

/** One item per line — what Trello turns into one card per line on paste. */
export function toPlainList(items: ShoppingItem[]): string {
  return items
    .filter((i) => !i.excluded)
    .map((i) => (i.amount ? `${i.name} — ${i.amount}` : i.name))
    .join("\n");
}

export function toGroupedText(items: ShoppingItem[]): string {
  return groupByCategory(items.filter((i) => !i.excluded))
    .map(
      ([category, list]) =>
        `${category.toUpperCase()}\n` +
        list.map((i) => (i.amount ? `- ${i.name} (${i.amount})` : `- ${i.name}`)).join("\n"),
    )
    .join("\n\n");
}

export { formatQuantity };
