/**
 * Reading FormData in server actions. Every field goes through here so the
 * trimming, blank-to-null, and number parsing rules are the same everywhere.
 */

export function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

/** Trimmed value, or null when blank — for nullable text columns. */
export function optionalField(formData: FormData, name: string): string | null {
  return field(formData, name) || null;
}

/** Accepts "2", "1.5", "1/2" and "1 1/2". Anything else is null. */
export function parseQuantity(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;

  const mixed = value.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);

  const fraction = value.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** parseQuantity, as the string Drizzle expects for numeric columns. */
export function numericOrNull(raw: string): string | null {
  const n = parseQuantity(raw);
  return n == null ? null : String(n);
}
