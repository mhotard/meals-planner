import { categoryRank, type Category } from "./categories";
import type { Supply } from "./supply";

export type ShoppingItem = {
  /** Stable across rebuilds so check/skip state sticks to the right line. */
  key: string;
  name: string;
  category: Category;
  amount: string;
  /** Which recipes drove this line, for the "why is this here?" hint. */
  fromRecipes: string[];
  supply: Supply;
  isExtra: boolean;
  checked: boolean;
  /** Not being bought this week: skipped, or a pantry item we already have. */
  excluded: boolean;
};

/**
 * Splits the list into what we're buying and the pantry items this week's
 * recipes touch, which are only worth a glance.
 */
export function partitionList(items: ShoppingItem[]) {
  const toBuy: ShoppingItem[] = [];
  const pantryCheck: ShoppingItem[] = [];

  for (const item of items) {
    if (item.supply === "pantry" && item.excluded) pantryCheck.push(item);
    else toBuy.push(item);
  }

  return { toBuy, pantryCheck };
}

export function groupByCategory(items: ShoppingItem[]) {
  const map = new Map<Category, ShoppingItem[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return [...map.entries()].sort(([a], [b]) => categoryRank(a) - categoryRank(b));
}
