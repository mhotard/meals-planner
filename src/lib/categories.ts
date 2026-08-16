/** Grocery aisles, in the order we actually walk the store. */
export const CATEGORIES = [
  "produce",
  "meat & seafood",
  "dairy & eggs",
  "bakery",
  "pantry",
  "spices",
  "frozen",
  "drinks",
  "household",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Aisle markers — quick visual anchors when scanning the list in a store. */
export const CATEGORY_ICONS: Record<string, string> = {
  produce: "🥬",
  "meat & seafood": "🥩",
  "dairy & eggs": "🥚",
  bakery: "🍞",
  pantry: "🥫",
  spices: "🧂",
  frozen: "🧊",
  drinks: "☕",
  household: "🧻",
  other: "🛒",
};

export function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? CATEGORY_ICONS.other;
}

export function categoryRank(category: string): number {
  const i = CATEGORIES.indexOf(category as Category);
  return i === -1 ? CATEGORIES.length : i;
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}
