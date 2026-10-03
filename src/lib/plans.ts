export type PlanEntry = {
  id: number;
  dayOfWeek: number;
  recipeId: number | null;
  recipeName: string | null;
  customLabel: string | null;
  sortOrder: number;
};

export function groupByDay(entries: PlanEntry[]): PlanEntry[][] {
  const days: PlanEntry[][] = Array.from({ length: 7 }, () => []);
  for (const entry of entries) {
    if (entry.dayOfWeek >= 0 && entry.dayOfWeek < 7) days[entry.dayOfWeek].push(entry);
  }
  return days;
}
