import { isCategory } from "./categories";
import type { Category } from "./categories";
import { isSupply } from "./supply";
import type { Supply } from "./supply";
import { isValidWeekStart, parseISODate, toISODate } from "./dates";
import { field, integerValue, optionalField, quantityValue, rejectInput, textField, textValue, validate } from "./form";
import type { ValidationResult } from "./form";
import { normalizeUnit } from "./units";

export type ValidatedRecipeInput = {
  name: string;
  description: string | null;
  notes: string | null;
  sourceUrl: string | null;
  servings: number | null;
  prepMinutes: number | null;
  ingredients: { name: string; quantity: string | null; unit: string | null; note: string | null }[];
};

export function categoryValue(raw: unknown): Category {
  if (typeof raw !== "string" || !isCategory(raw)) rejectInput("Choose a supported grocery aisle.");
  return raw;
}

export function supplyValue(raw: unknown): Supply {
  if (typeof raw !== "string" || !isSupply(raw)) rejectInput("Choose a supported purchasing rule.");
  return raw;
}

/** Keep custom count units, normalized; prevent controls and unbounded keys. */
export function unitValue(raw: unknown): string | null {
  const unit = normalizeUnit(textValue(raw, "Unit", 40));
  if (unit && !/^[a-z][a-z0-9 ./%()-]*$/.test(unit)) rejectInput("Unit must use letters, numbers, spaces, or simple punctuation.");
  return unit || null;
}

export function dateValue(raw: unknown, label = "Date"): string {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number(raw.slice(0, 4)) < 1000 || toISODate(parseISODate(raw)) !== raw) {
    rejectInput(`${label} must be a real date in YYYY-MM-DD format (year 1000–9999).`);
  }
  return raw;
}

export function weekValue(raw: unknown): string {
  const week = dateValue(raw, "Week");
  if (!isValidWeekStart(week)) rejectInput("Choose a Monday for the week start.");
  return week;
}

export function dayValue(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0 || raw > 6) rejectInput("Choose a day from Monday through Sunday.");
  return raw;
}

export function sourceUrlValue(raw: string): string | null {
  if (!raw) return null;
  textValue(raw, "Source link", 2048);
  if (/\s/.test(raw)) rejectInput("Source link must not contain spaces or line breaks; use URL encoding.");
  let url: URL;
  try { url = new URL(raw); } catch { rejectInput("Source link must be a valid HTTP or HTTPS URL."); }
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) rejectInput("Source link must be an HTTP or HTTPS URL without credentials.");
  return raw;
}

export function itemStatePatch(raw: unknown): { checked?: boolean; excluded?: boolean } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) rejectInput("Invalid shopping item update.");
  const entries = Object.entries(raw);
  if (!entries.length || entries.some(([key, value]) => !["checked", "excluded"].includes(key) || typeof value !== "boolean")) rejectInput("Shopping updates accept checked/excluded booleans only.");
  return Object.fromEntries(entries);
}

export function itemKeyValue(raw: unknown): string {
  const key = textValue(raw, "Shopping item", 128, true);
  if (!/^(?:extra:[1-9]\d*|ing:[1-9]\d*:(?:family:(?:mass|volume)|unit:[^:]*))$/.test(key)) rejectInput("Invalid shopping item key.");
  return key;
}

export function validateRecipeInput(formData: FormData): ValidationResult<ValidatedRecipeInput> {
  return validate(() => {
    const names = formData.getAll("ing-name");
    const quantities = formData.getAll("ing-quantity");
    const units = formData.getAll("ing-unit");
    const notes = formData.getAll("ing-note");
    if (names.length > 100 || [quantities, units, notes].some((rows) => rows.length !== names.length)) rejectInput("Ingredient rows must contain matching name, quantity, unit, and note fields (up to 100 rows).");
    const ingredients = names.flatMap((raw, i) => {
      const name = textValue(raw, `Ingredient ${i + 1} name`, 200);
      const quantityRaw = textValue(quantities[i], `Ingredient ${i + 1} quantity`, 64);
      const unitRaw = textValue(units[i], `Ingredient ${i + 1} unit`, 40);
      const note = textValue(notes[i], `Ingredient ${i + 1} note`, 1000) || null;
      if (!name) {
        if (quantityRaw || unitRaw || note) rejectInput(`Ingredient ${i + 1} needs a name.`);
        return [];
      }
      return [{ name, quantity: quantityValue(quantityRaw, `Ingredient ${i + 1} quantity`), unit: unitValue(unitRaw), note }];
    });
    return {
      name: textField(formData, "name", "Recipe name", 200, true),
      description: optionalField(formData, "description", 2000),
      notes: optionalField(formData, "notes"),
      sourceUrl: sourceUrlValue(field(formData, "sourceUrl")),
      servings: integerValue(field(formData, "servings"), "Servings", 1, 1000),
      prepMinutes: integerValue(field(formData, "prepMinutes"), "Prep minutes", 0, 10080),
      ingredients,
    };
  });
}
