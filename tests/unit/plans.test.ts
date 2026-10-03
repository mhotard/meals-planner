import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, isValidWeekStart, weekStartOf } from "../../src/lib/dates";
import { groupByDay, type PlanEntry } from "../../src/lib/plans";
import { planForTrello } from "../../src/lib/export";

test("Sunday belongs to the preceding Monday even across a year boundary", () => {
  assert.equal(weekStartOf(new Date(2026, 0, 4)), "2025-12-29");
  assert.equal(addDays("2025-12-29", 6), "2026-01-04");
});

test("week identifiers require a real Monday in YYYY-MM-DD form", () => {
  assert.equal(isValidWeekStart("2026-09-28"), true);
  for (const value of ["2026-09-29", "2026-02-30", "2026-13-01", "2026-9-28", "invalid"]) {
    assert.equal(isValidWeekStart(value), false, value);
  }
});

test("a week preserves multiple meals and custom entries, with seven independent days", () => {
  const meal: PlanEntry = {
    id: 1, dayOfWeek: 0, recipeId: 1, recipeName: "Pasta", customLabel: null, sortOrder: 0,
  };
  const custom: PlanEntry = {
    id: 2, dayOfWeek: 0, recipeId: null, recipeName: null, customLabel: "Leftovers", sortOrder: 1,
  };
  const days = groupByDay([meal, custom, { ...meal, id: 3, dayOfWeek: 7 }]);
  assert.equal(days.length, 7);
  assert.deepEqual(days[0], [meal, custom]);
  assert.deepEqual(days.slice(1), [[], [], [], [], [], []]);
  assert.notEqual(days[1], days[2]);
  assert.equal(planForTrello("2026-09-28", days), "Monday Sep 28: Pasta + Leftovers");
});
