/**
 * Unit handling for structured quantities.
 *
 * Units in the same family convert into each other, so "2 lb chicken" in one
 * recipe and "8 oz chicken" in another add up to a single 2.5 lb line on the
 * shopping list. Anything unrecognised (or count-like, e.g. "clove") only ever
 * combines with itself.
 */

type Family = "mass" | "volume";

const CONVERSIONS: Record<string, { family: Family; factor: number }> = {
  // mass, base gram
  g: { family: "mass", factor: 1 },
  kg: { family: "mass", factor: 1000 },
  oz: { family: "mass", factor: 28.3495 },
  lb: { family: "mass", factor: 453.592 },
  // volume, base millilitre
  ml: { family: "volume", factor: 1 },
  l: { family: "volume", factor: 1000 },
  tsp: { family: "volume", factor: 4.92892 },
  tbsp: { family: "volume", factor: 14.7868 },
  "fl oz": { family: "volume", factor: 29.5735 },
  cup: { family: "volume", factor: 236.588 },
  pt: { family: "volume", factor: 473.176 },
  qt: { family: "volume", factor: 946.353 },
  gal: { family: "volume", factor: 3785.41 },
};

/** Unknown/count units must never resolve inherited object properties. */
function conversionFor(unit: string) {
  return Object.hasOwn(CONVERSIONS, unit) ? CONVERSIONS[unit] : undefined;
}

/** Offered in the unit dropdown, in the order cooks tend to reach for them. */
export const UNIT_OPTIONS = [
  "",
  "tsp",
  "tbsp",
  "cup",
  "fl oz",
  "pt",
  "qt",
  "gal",
  "ml",
  "l",
  "oz",
  "lb",
  "g",
  "kg",
  "clove",
  "can",
  "jar",
  "pkg",
  "bunch",
  "head",
  "slice",
  "sprig",
  "pinch",
  "dash",
] as const;

export function normalizeUnit(unit: string | null | undefined): string {
  return (unit ?? "").trim().toLowerCase();
}

/** Key that decides which quantities can be summed together. */
export function unitGroupKey(unit: string | null | undefined): string {
  const u = normalizeUnit(unit);
  const conv = conversionFor(u);
  return conv ? `family:${conv.family}` : `unit:${u}`;
}

export function toBase(quantity: number, unit: string | null | undefined): number {
  const conv = conversionFor(normalizeUnit(unit));
  return conv ? quantity * conv.factor : quantity;
}

/**
 * Render a base-unit total back into the friendliest of the units that were
 * actually written down: the largest one that still leaves a value >= 1.
 */
export function fromBase(
  baseTotal: number,
  unitsSeen: string[],
): { quantity: number; unit: string } {
  const known = unitsSeen
    .map((u) => normalizeUnit(u))
    .flatMap((unit) => {
      const conversion = conversionFor(unit);
      return conversion ? [{ unit, conversion }] : [];
    })
    .sort((a, b) => b.conversion.factor - a.conversion.factor);

  if (known.length === 0) {
    return { quantity: baseTotal, unit: normalizeUnit(unitsSeen[0]) };
  }

  const chosen =
    known.find((item) => baseTotal / item.conversion.factor >= 1) ?? known[known.length - 1];

  return { quantity: baseTotal / chosen.conversion.factor, unit: chosen.unit };
}

const FRACTIONS: [number, string][] = [
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
];

/** 0.5 -> "½", 1.75 -> "1¾", 2.4 -> "2.4" */
export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 100) / 100;
  const whole = Math.floor(rounded);
  const rest = rounded - whole;

  if (rest < 0.02) return String(whole);
  const match = FRACTIONS.find(([v]) => Math.abs(rest - v) < 0.03);
  if (match) return whole === 0 ? match[1] : `${whole}${match[1]}`;

  return String(Number(rounded.toFixed(2)));
}

export function formatAmount(
  quantity: number | null | undefined,
  unit: string | null | undefined,
): string {
  const u = normalizeUnit(unit);
  if (quantity == null) return u;
  const q = formatQuantity(Number(quantity));
  return u ? `${q} ${u}` : q;
}
