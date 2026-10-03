import ActionForm from "@/components/action-form";
import Link from "next/link";
import { requireUser } from "@/server/auth";
import { getPlanByWeek, getPlanEntries } from "@/server/plans";
import { groupByDay } from "@/lib/plans";
import { recentlyCooked, staleFavorites } from "@/server/recipes";
import {
  DAY_NAMES,
  addDays,
  formatShortDate,
  formatWeekRange,
  relativeDays,
  toISODate,
  weekStartOf,
} from "@/lib/dates";
import { createPlan } from "./plans/actions";

export default async function HomePage() {
  const user = await requireUser();
  const week = weekStartOf();
  const plan = await getPlanByWeek(week);
  const today = toISODate(new Date());

  const days = plan ? groupByDay(await getPlanEntries(plan.id)) : null;
  const recent = await recentlyCooked(5);
  const stale = await staleFavorites(4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-3xl">Hi {user.name}</h1>
        <p className="mt-1 text-sm text-muted">Week of {formatWeekRange(week)}</p>
      </div>

      {!plan || !days ? (
        <div className="card p-12 text-center">
          <p className="text-4xl">🗓️</p>
          <p className="mt-3 display text-lg">Nothing planned this week</p>
          <p className="mt-1 text-sm text-muted">
            Pick a few recipes and the shopping list writes itself.
          </p>
          <ActionForm action={createPlan.bind(null, week)} className="mt-5">
            <button type="submit" className="btn-primary">
              Plan this week
            </button>
          </ActionForm>
        </div>
      ) : (
        <>
          <section className="card overflow-hidden">
            {DAY_NAMES.map((dayName, dayIndex) => {
              const date = addDays(week, dayIndex);
              const meals = days[dayIndex];
              const isToday = date === today;

              return (
                <div
                  key={dayName}
                  className={`flex gap-4 border-b border-line px-4 py-3 text-sm last:border-0 ${
                    isToday ? "bg-accent-soft/70" : ""
                  }`}
                >
                  <span className="flex w-36 shrink-0 items-baseline gap-1.5 whitespace-nowrap">
                    {isToday && (
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-accent"
                        aria-label="Today"
                      />
                    )}
                    <span className={isToday ? "font-semibold text-accent" : "font-medium"}>
                      {dayName}
                    </span>
                    <span className="text-xs text-muted">{formatShortDate(date)}</span>
                  </span>
                  <span className="flex-1">
                    {meals.length === 0 ? (
                      <span className="text-muted/60">—</span>
                    ) : (
                      meals.map((entry, i) => (
                        <span key={entry.id}>
                          {i > 0 && <span className="text-muted"> · </span>}
                          {entry.recipeId ? (
                            <Link
                              href={`/recipes/${entry.recipeId}`}
                              className="font-medium decoration-accent/40 underline-offset-4 hover:underline"
                            >
                              {entry.recipeName}
                            </Link>
                          ) : (
                            <span className="italic text-muted">{entry.customLabel}</span>
                          )}
                        </span>
                      ))
                    )}
                  </span>
                </div>
              );
            })}
          </section>

          <div className="flex flex-wrap gap-2">
            <Link href={`/plans/${week}/shopping`} className="btn-primary">
              Shopping list
            </Link>
            <Link href={`/plans/${week}`} className="btn-secondary">
              Edit this week
            </Link>
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-3 display text-lg">Recently made</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">Nothing logged yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recent.map((log) => (
                <li key={log.id} className="flex justify-between gap-3">
                  <Link href={`/recipes/${log.recipeId}`} className="hover:underline">
                    {log.name}
                  </Link>
                  <span className="shrink-0 text-xs text-muted">
                    {relativeDays(log.cookedOn)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <h2 className="mb-1 display text-lg">Haven&apos;t made in a while</h2>
          <p className="mb-3 text-xs text-muted">For when nothing sounds good.</p>
          {stale.length === 0 ? (
            <p className="text-sm text-muted">Log a few meals and suggestions show up here.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {stale.map((r) => (
                <li key={r.id} className="flex justify-between gap-3">
                  <Link href={`/recipes/${r.id}`} className="hover:underline">
                    {r.name}
                  </Link>
                  <span className="shrink-0 text-xs text-muted">
                    {r.lastCookedOn ? relativeDays(r.lastCookedOn) : "never"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
