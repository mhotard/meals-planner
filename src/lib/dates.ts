/**
 * All week math is done on plain YYYY-MM-DD strings in local time, so a plan
 * for "the week of Mar 3" never shifts because of a timezone boundary.
 */

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Monday of the week containing `date`. */
export function weekStartOf(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const shift = (d.getDay() + 6) % 7; // Sunday(0) -> 6
  d.setDate(d.getDate() - shift);
  return toISODate(d);
}

export function isValidWeekStart(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && weekStartOf(parseISODate(iso)) === iso;
}

export function formatWeekRange(weekStart: string): string {
  const start = parseISODate(weekStart);
  const end = parseISODate(addDays(weekStart, 6));
  const sameMonth = start.getMonth() === end.getMonth();
  const startFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(start);
  const endFmt = new Intl.DateTimeFormat("en-US", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
  }).format(end);
  return `${startFmt} – ${endFmt}`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseISODate(iso));
}

/** "3 days ago", "2 weeks ago" — for last-cooked badges. */
export function relativeDays(iso: string, today: Date = new Date()): string {
  const diff = Math.round(
    (parseISODate(toISODate(today)).getTime() - parseISODate(iso).getTime()) / 86_400_000,
  );
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff < 0) return `in ${Math.abs(diff)}d`;
  if (diff < 14) return `${diff} days ago`;
  if (diff < 60) return `${Math.round(diff / 7)} weeks ago`;
  return `${Math.round(diff / 30)} months ago`;
}
