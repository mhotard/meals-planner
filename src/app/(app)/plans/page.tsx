import Link from "next/link";
import { requireUser } from "@/server/auth";
import { listPlans } from "@/server/plans";
import { addDays, formatWeekRange, toISODate, weekStartOf } from "@/lib/dates";
import { createPlan, createPlanForDate } from "./actions";

type PlanRow = Awaited<ReturnType<typeof listPlans>>[number];

function PlanList({ plans, thisWeek }: { plans: PlanRow[]; thisWeek: string }) {
  return (
    <ul className="card divide-y divide-line">
      {plans.map((plan) => (
        <li key={plan.id}>
          <Link
            href={`/plans/${plan.weekStart}`}
            className="flex items-center justify-between gap-4 p-4 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-accent-soft/50"
          >
            <div>
              <p className="flex items-center gap-2 font-medium">
                {formatWeekRange(plan.weekStart)}
                {plan.weekStart === thisWeek && (
                  <span className="chip-accent">this week</span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {plan.mealCount === 0
                  ? "nothing planned yet"
                  : `${plan.mealCount} meal${plan.mealCount === 1 ? "" : "s"}`}
              </p>
            </div>
            <span className="text-muted" aria-hidden>
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function PlansPage() {
  await requireUser();
  const plans = await listPlans();
  const thisWeek = weekStartOf();
  const nextWeek = addDays(thisWeek, 7);
  const planned = new Set(plans.map((p) => p.weekStart));

  // listPlans returns newest first; upcoming reads better oldest first.
  const upcoming = plans.filter((p) => p.weekStart > thisWeek).reverse();
  const current = plans.filter((p) => p.weekStart === thisWeek);
  const past = plans.filter((p) => p.weekStart < thisWeek);

  return (
    <div className="space-y-8">
      <h1 className="display text-3xl">Meal plans</h1>

      <section className="card p-6">
        <h2 className="mb-1 display text-lg">Start a new week</h2>
        <p className="mb-4 text-sm text-muted">
          Plan as far ahead as you like — pick any date and it opens that week.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {!planned.has(thisWeek) && (
            <form action={createPlan.bind(null, thisWeek)}>
              <button type="submit" className="btn-primary">
                This week
              </button>
            </form>
          )}
          {!planned.has(nextWeek) && (
            <form action={createPlan.bind(null, nextWeek)}>
              <button type="submit" className="btn-secondary">
                Next week ({formatWeekRange(nextWeek)})
              </button>
            </form>
          )}

          <form action={createPlanForDate} className="flex items-center gap-2">
            <label htmlFor="plan-date" className="text-sm text-muted">
              or week of
            </label>
            <input
              id="plan-date"
              type="date"
              name="date"
              required
              defaultValue={toISODate(new Date())}
              className="input w-auto"
            />
            <button type="submit" className="btn-secondary">
              Go
            </button>
          </form>
        </div>
      </section>

      {current.length > 0 && (
        <section>
          <h2 className="mb-2 eyebrow">This week</h2>
          <PlanList plans={current} thisWeek={thisWeek} />
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-2 eyebrow">Coming up</h2>
          <PlanList plans={upcoming} thisWeek={thisWeek} />
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-2 eyebrow">Past weeks</h2>
          <PlanList plans={past} thisWeek={thisWeek} />
          <p className="mt-2 text-xs text-muted">
            Old plans stick around — handy for “what did we eat that week we liked?”
          </p>
        </section>
      )}

      {plans.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-4xl">🗓️</p>
          <p className="mt-3 display text-lg">No plans yet</p>
          <p className="mt-1 text-sm text-muted">
            Start with this week — it takes about a minute.
          </p>
        </div>
      )}
    </div>
  );
}
