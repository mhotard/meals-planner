import type { PlanEntry } from "./plans";
import type { ShoppingItem } from "./shopping";
import { groupByCategory } from "./shopping";
import { DAY_NAMES, addDays, formatWeekRange, parseISODate } from "./dates";

function dayHeading(weekStart: string, dayIndex: number): string {
  const date = parseISODate(addDays(weekStart, dayIndex));
  const short = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
  return `${DAY_NAMES[dayIndex]} ${short}`;
}

export function planAsText(weekStart: string, days: PlanEntry[][]): string {
  const lines = [`Meals — week of ${formatWeekRange(weekStart)}`, ""];

  for (const [dayIndex, entries] of days.entries()) {
    const meals = entries.map((e) => e.recipeName ?? e.customLabel).filter(Boolean);
    lines.push(`${dayHeading(weekStart, dayIndex)}: ${meals.length ? meals.join(", ") : "—"}`);
  }

  return lines.join("\n");
}

export function shoppingAsText(weekStart: string, items: ShoppingItem[]): string {
  const active = items.filter((i) => !i.excluded);
  const lines = [`Shopping list — week of ${formatWeekRange(weekStart)}`, ""];

  for (const [category, list] of groupByCategory(active)) {
    lines.push(category.toUpperCase());
    for (const item of list) {
      lines.push(item.amount ? `- ${item.name} (${item.amount})` : `- ${item.name}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/** One item per line, no decoration — Trello makes one card per line. */
export function shoppingForTrello(items: ShoppingItem[]): string {
  return items
    .filter((i) => !i.excluded && !i.checked)
    .map((i) => (i.amount ? `${i.name} (${i.amount})` : i.name))
    .join("\n");
}

/** One card per day, so the week becomes a Trello list. */
export function planForTrello(weekStart: string, days: PlanEntry[][]): string {
  return days
    .map((entries, dayIndex) => {
      const meals = entries.map((e) => e.recipeName ?? e.customLabel).filter(Boolean);
      return meals.length ? `${dayHeading(weekStart, dayIndex)}: ${meals.join(" + ")}` : null;
    })
    .filter(Boolean)
    .join("\n");
}
