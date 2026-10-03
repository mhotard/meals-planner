import "server-only";

import { eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { ShoppingItem } from "@/lib/shopping";
import { categoryRank, type Category } from "@/lib/categories";
import type { Supply } from "@/lib/supply";
import { formatAmount, fromBase, toBase, unitGroupKey } from "@/lib/units";

type Accumulator = {
  name: string;
  category: Category;
  supply: Supply;
  base: number | null;
  unitsSeen: string[];
  fromRecipes: Set<string>;
};

/**
 * Builds the week's list: every ingredient from the planned recipes, combined
 * across recipes where the units allow it, plus the every-week items, plus any
 * ad-hoc items typed in for this week.
 *
 * Pantry ingredients are included but start out excluded — the shopping page
 * shows them as a "do you have enough?" prompt instead of something to buy.
 */
export async function buildShoppingList(planId: number): Promise<ShoppingItem[]> {
  const db = await getDb();

  const entries = await db
    .select({ recipeId: schema.mealPlanEntries.recipeId })
    .from(schema.mealPlanEntries)
    .where(eq(schema.mealPlanEntries.planId, planId));

  const recipeIds = [
    ...new Set(entries.map((e) => e.recipeId).filter((id): id is number => id != null)),
  ];

  const lines = recipeIds.length
    ? await db
        .select({
          recipeName: schema.recipes.name,
          ingredientId: schema.ingredients.id,
          name: schema.ingredients.name,
          category: schema.ingredients.category,
          supply: schema.ingredients.supply,
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
      { name: line.name, category: line.category, supply: line.supply },
      quantity,
      line.unit,
      line.recipeName,
    );
  }

  // Every-week items are on the list whether or not a recipe called for them.
  const weekly = await db
    .select()
    .from(schema.ingredients)
    .where(eq(schema.ingredients.supply, "weekly"));

  for (const item of weekly) {
    const quantity = item.weeklyQuantity == null ? null : Number(item.weeklyQuantity);
    const key = `ing:${item.id}:${unitGroupKey(item.weeklyUnit)}`;
    const existing = groups.get(key);

    if (!existing) {
      accumulate(
        key,
        { name: item.name, category: item.category, supply: "weekly" },
        quantity,
        item.weeklyUnit,
      );
      continue;
    }

    // The recipes already need some of this. Buy the usual weekly amount, or
    // the recipes' total if that's more — never less than either.
    existing.supply = "weekly";
    if (quantity != null) {
      const weeklyBase = toBase(quantity, item.weeklyUnit);
      if (existing.base == null || weeklyBase > existing.base) {
        existing.base = weeklyBase;
        existing.unitsSeen.push(item.weeklyUnit ?? "");
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
      supply: acc.supply,
      isExtra: false,
      checked: state?.checked ?? false,
      // Pantry items sit out by default; moving one onto the list writes an
      // explicit row with excluded = false.
      excluded: state?.excluded ?? acc.supply === "pantry",
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
      supply: "per_recipe",
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
