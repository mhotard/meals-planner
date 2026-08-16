import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPlanByToken, getPlanEntries, groupByDay } from "@/lib/plans";
import { buildShoppingList, groupByCategory } from "@/lib/shopping";
import { DAY_NAMES, addDays, formatWeekRange, parseISODate } from "@/lib/dates";
import { planForTrello, shoppingAsText, shoppingForTrello } from "@/lib/export";
import ShoppingList from "@/components/shopping-list";
import CopyButtons from "@/components/copy-buttons";

export const metadata: Metadata = {
  title: "Meal plan",
  // A share link shouldn't turn up in search results.
  robots: { index: false, follow: false },
};

export default async function SharedPlanPage({ params }: PageProps<"/share/[token]">) {
  const { token } = await params;
  const plan = await getPlanByToken(token);
  if (!plan) notFound();

  const entries = await getPlanEntries(plan.id);
  const days = groupByDay(entries);
  const items = await buildShoppingList(plan.id);
  const groups = groupByCategory(items.filter((i) => !i.excluded));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <header className="mb-8">
        <p className="text-sm text-muted">🍲 Meal Planner</p>
        <h1 className="mt-1 display text-3xl">
          Week of {formatWeekRange(plan.weekStart)}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {entries.length} meal{entries.length === 1 ? "" : "s"} planned · shared, view only
        </p>
      </header>

      <section className="card mb-6 p-6">
        <h2 className="mb-4 display text-lg">The week</h2>
        <ul className="divide-y divide-line">
          {DAY_NAMES.map((dayName, dayIndex) => {
            const meals = days[dayIndex]
              .map((e) => e.recipeName ?? e.customLabel)
              .filter(Boolean);
            const date = parseISODate(addDays(plan.weekStart, dayIndex));

            return (
              <li key={dayName} className="flex gap-4 py-2 text-sm">
                <span className="w-36 shrink-0 whitespace-nowrap">
                  <span className="font-medium">{dayName}</span>
                  <span className="ml-1 text-xs text-muted">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                    }).format(date)}
                  </span>
                </span>
                <span className={meals.length ? "" : "text-muted"}>
                  {meals.length ? meals.join(" · ") : "—"}
                </span>
              </li>
            );
          })}
        </ul>

        {plan.notes && (
          <p className="mt-4 whitespace-pre-wrap rounded-lg bg-accent-soft/60 p-3 text-sm">
            {plan.notes}
          </p>
        )}
      </section>

      <section className="card p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="display text-lg">Shopping list</h2>
        </div>

        <div className="mb-6">
          <CopyButtons
            formats={[
              {
                id: "trello-shopping",
                label: "Copy for Trello",
                hint: "One item per line — Trello makes one card per line",
                text: shoppingForTrello(items),
              },
              {
                id: "text-shopping",
                label: "Copy as text",
                hint: "Grouped by aisle",
                text: shoppingAsText(plan.weekStart, items),
              },
              {
                id: "trello-plan",
                label: "Copy meals for Trello",
                hint: "One card per day",
                text: planForTrello(plan.weekStart, days),
              },
            ]}
          />
        </div>

        <ShoppingList groups={groups} />
      </section>
    </main>
  );
}
