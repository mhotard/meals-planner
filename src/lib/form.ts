/** Shared form results, strict readers, and supported kitchen quantities. */
export type MutationResult = { error?: string };
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export class InputError extends Error {}
export function rejectInput(message: string): never {
  throw new InputError(message);
}

export function validate<T>(read: () => T): ValidationResult<T> {
  try {
    return { ok: true, value: read() };
  } catch (error) {
    if (error instanceof InputError) return { ok: false, error: error.message };
    throw error;
  }
}

/** Catch expected input errors only; database/runtime failures still propagate. */
export async function mutationResult(action: () => Promise<void>): Promise<MutationResult> {
  try {
    await action();
    return {};
  } catch (error) {
    if (error instanceof InputError) return { error: error.message };
    throw error;
  }
}

export function field(formData: FormData, name: string): string {
  const values = formData.getAll(name);
  if (values.length > 1 || values.some((value) => typeof value !== "string")) {
    rejectInput(`Provide one text value for ${name}.`);
  }
  return (values[0] as string | undefined)?.trim() ?? "";
}

export function textValue(raw: unknown, label: string, max: number, required = false): string {
  if (typeof raw !== "string") rejectInput(`${label} must be text.`);
  const value = raw.trim();
  if (required && !value) rejectInput(`${label} is required.`);
  if (value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    rejectInput(`${label} must be at most ${max} characters without control characters.`);
  }
  return value;
}

export function textField(formData: FormData, name: string, label: string, max: number, required = false): string {
  return textValue(field(formData, name), label, max, required);
}

export function optionalField(formData: FormData, name: string, max = 10000): string | null {
  return textField(formData, name, name, max) || null;
}

/** Blank is absent. Invalid formats are null here; validators distinguish them. */
export function parseQuantity(raw: string): number | null {
  const value = raw.trim();
  if (!value || value.length > 64) return null;
  const mixed = value.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  const fraction = value.match(/^(\d+)\/(\d+)$/);
  let n: number;
  if (mixed) {
    if (Number(mixed[3]) === 0) return null;
    n = Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  } else if (fraction) {
    if (Number(fraction[2]) === 0) return null;
    n = Number(fraction[1]) / Number(fraction[2]);
  } else {
    if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)) return null;
    n = Number(value);
  }
  return Number.isFinite(n) ? n : null;
}

/** Numeric(10, scale); fractions round to storage precision, decimals must fit. */
export function quantityValue(raw: string, label = "Quantity", scale = 3): string | null {
  if (!raw.trim()) return null;
  const n = parseQuantity(raw);
  const max = 10 ** (10 - scale) - 10 ** -scale;
  if (n == null || n <= 0 || n > max) rejectInput(`${label} must be a positive number or fraction within the supported range.`);
  const decimals = raw.trim().split(".")[1]?.replace(/0+$/, "");
  if (decimals && decimals.length > scale) rejectInput(`${label} allows at most ${scale} decimal places.`);
  const rounded = Number(n.toFixed(scale));
  if (rounded === 0) rejectInput(`${label} is too small to store.`);
  return String(rounded);
}

export function numericOrNull(raw: string): string | null {
  return quantityValue(raw);
}

export function integerValue(raw: string, label: string, min: number, max: number): number | null {
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) rejectInput(`${label} must be a whole number from ${min} to ${max}.`);
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) rejectInput(`${label} must be a whole number from ${min} to ${max}.`);
  return value;
}

export function positiveId(raw: unknown, label = "ID"): number {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1 || raw > 2147483647) {
    rejectInput(`${label} must be a positive ID.`);
  }
  return raw;
}
