/**
 * How often an ingredient gets bought. This drives everything the shopping
 * list does with it, so the three cases are deliberately distinct:
 *
 *   weekly      on every list, whatever is planned — milk, bread, eggs
 *   pantry      already in the cupboard; shown as a "check you have enough"
 *               prompt rather than something to buy — olive oil, oregano
 *   per_recipe  bought only because a recipe needs it — chicken, broccoli
 */
export const SUPPLY = ["weekly", "pantry", "per_recipe"] as const;

export type Supply = (typeof SUPPLY)[number];

export const SUPPLY_LABELS: Record<Supply, string> = {
  weekly: "Every week",
  pantry: "Pantry — now and then",
  per_recipe: "Only when a recipe needs it",
};

/** Short form for badges. */
export const SUPPLY_BADGES: Record<Supply, string | null> = {
  weekly: "every week",
  pantry: "pantry",
  per_recipe: null,
};

export function isSupply(value: string): value is Supply {
  return (SUPPLY as readonly string[]).includes(value);
}

export function toSupply(value: unknown, fallback: Supply = "per_recipe"): Supply {
  return typeof value === "string" && isSupply(value) ? value : fallback;
}
