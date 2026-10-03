import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { getBaseUrl } from "@/server/base-url";
import { getPlanByWeek, getPlanEntries } from "@/server/plans";
import { groupByDay } from "@/lib/plans";
import { listRecipes } from "@/server/recipes";
import {
  DAY_NAMES,
  addDays,
  formatShortDate,
  formatWeekRange,
  isValidWeekStart,
  toISODate,
  weekStartOf,
} from "@/lib/dates";
import {
  addCustomToDay,
  addRecipeToDay,
  createPlan,
  logWeekAsCooked,
  removePlanEntry,
  updatePlanNotes,
} from "../actions";
import RecipePicker from "./recipe-picker";
import ShareLink from "./share-link";
import InlineNotes from "@/components/inline-notes";

export default async function PlanPage({ params }: PageProps<"/plans/[week]">) {
  await requireUser();
  const { week } = await params;
  if (!isValidWeekStart(week)) notFound();

  const plan = await getPlanByWeek(week);
  const recipes = await listRecipes();

  if (!plan) {
    return (
      <div className="space-y-6">
        <Link href="/plans" className="text-sm text-muted hover:text-foreground">
          ← Plans
        </Link>
        <div className="card p-10 text-center">
          <h1 className="text-xl font-semibold">Week of {formatWeekRange(week)}</h1>
          <p className="mt-2 text-sm text-muted">No plan for this week yet.</p>
          <form action={createPlan.bind(null, week)} className="mt-4">
            <button type="submit" className="btn-primary">
              Start planning this week
            </button>
          </form>
        </div>
      </div>
    );
  }

  const entries = await getPlanEntries(plan.id);
  const days = groupByDay(entries);
  const isCurrentWeek = week === weekStartOf();
  const todayISO = toISODate(new Date());

  const pickerRecipes = recipes.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    prepMinutes: r.prepMinutes,
    timesCooked: r.timesCooked,
    lastCookedOn: r.lastCookedOn,
  }));
  const plannedRecipeIds = entries
    .map((e) => e.recipeId)
    .filter((id): id is number => id != null);

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link href="/plans" className="text-sm text-muted hover:text-foreground">
          ← Plans
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="display text-3xl">Week of {formatWeekRange(week)}</h1>
          <p className="mt-1 text-sm text-muted">
            {entries.length} meal{entries.length === 1 ? "" : "s"} planned
            {isCurrentWeek && " · this week"}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Link href={`/plans/${week}/shopping`} className="btn-primary">
            Shopping list
          </Link>
          <Link
            href={`/plans/${addDays(week, -7)}`}
            className="btn-secondary"
            title="Previous week"
          >
            ←
          </Link>
          <Link href={`/plans/${addDays(week, 7)}`} className="btn-secondary" title="Next week">
            →
          </Link>
        </div>
      </div>

      <ShareLink
        url={`${await getBaseUrl()}/share/${plan.shareToken}`}
        path={`/share/${plan.shareToken}`}
      />

      <div className="card divide-y divide-line">
        {DAY_NAMES.map((dayName, dayIndex) => {
          const date = addDays(week, dayIndex);
          const dayEntries = days[dayIndex];
          const isToday = date === todayISO;

          return (
            <div
              key={dayName}
              className={`grid gap-3 p-4 sm:grid-cols-[8rem_1fr] ${
                isToday ? "bg-accent-soft/40" : ""
              }`}
            >
              <div className="flex items-baseline gap-2 sm:block">
                <p
                  className={`display text-base ${isToday ? "text-accent" : ""}`}
                >
                  {dayName}
                </p>
                <p className="text-xs text-muted">
                  {formatShortDate(date)}
                  {isToday && <span className="ml-1 text-accent">· today</span>}
                </p>
              </div>

              <div className="space-y-2">
                {dayEntries.length === 0 && (
                  <p className="text-sm text-muted/70">Nothing planned</p>
                )}

                {dayEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-accent/15 bg-accent-soft/70 px-3 py-2"
                  >
                    {entry.recipeId ? (
                      <Link
                        href={`/recipes/${entry.recipeId}`}
                        className="text-sm font-medium decoration-accent/40 underline-offset-4 hover:underline"
                      >
                        {entry.recipeName}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium italic text-muted">
                        {entry.customLabel}
                      </span>
                    )}
                    <form
                      action={removePlanEntry.bind(null, week, entry.id)}
                      className="no-print"
                    >
                      <button
                        type="submit"
                        className="rounded-md px-1.5 text-xs text-muted opacity-0 transition-opacity hover:text-warn focus:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
                        aria-label={`Remove ${entry.recipeName ?? entry.customLabel} from ${dayName}`}
                      >
                        ✕
                      </button>
                    </form>
                  </div>
                ))}

                <div className="no-print">
                  <RecipePicker
                    dayLabel={dayName}
                    dayDate={formatShortDate(date)}
                    recipes={pickerRecipes}
                    plannedRecipeIds={plannedRecipeIds}
                    onPickRecipe={async (recipeId: number) => {
                      "use server";
                      await addRecipeToDay(week, dayIndex, recipeId);
                    }}
                    onPickCustom={async (label: string) => {
                      "use server";
                      await addCustomToDay(week, dayIndex, label);
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <InlineNotes
        title="Week notes"
        notes={plan.notes ?? ""}
        placeholder="Soccer Tuesday — needs to be fast. Guests Saturday."
        emptyText="No notes for this week."
        rows={3}
        action={updatePlanNotes.bind(null, week)}
      />

      <div className="no-print card flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <h2 className="display text-lg">Mark the week as cooked</h2>
          <p className="text-sm text-muted">
            Adds a cook-log entry for every recipe on this plan, on its planned day.
          </p>
        </div>
        <form action={logWeekAsCooked.bind(null, week)}>
          <button type="submit" className="btn-secondary">
            Log all meals
          </button>
        </form>
      </div>
    </div>
  );
}
