import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getPlanByWeek, getPlanEntries, groupByDay } from "@/lib/plans";
import { buildShoppingList, groupByCategory, partitionList } from "@/lib/shopping";
import { formatWeekRange, isValidWeekStart } from "@/lib/dates";
import { planForTrello, shoppingAsText, shoppingForTrello } from "@/lib/export";
import { CATEGORIES } from "@/lib/categories";
import { UNIT_OPTIONS } from "@/lib/units";
import ShoppingList from "@/components/shopping-list";
import PantryCheck from "@/components/pantry-check";
import CopyButtons from "@/components/copy-buttons";
import {
  addExtraItem,
  clearCheckedItems,
  removeExtraItem,
  toggleItemChecked,
  toggleItemExcluded,
} from "../../actions";

export default async function ShoppingPage({
  params,
}: PageProps<"/plans/[week]/shopping">) {
  await requireUser();
  const { week } = await params;
  if (!isValidWeekStart(week)) notFound();

  const plan = await getPlanByWeek(week);
  if (!plan) notFound();

  const items = await buildShoppingList(plan.id);
  const { toBuy, pantryCheck } = partitionList(items);
  const groups = groupByCategory(toBuy);
  const days = groupByDay(await getPlanEntries(plan.id));

  const active = toBuy.filter((i) => !i.excluded);
  const got = active.filter((i) => i.checked).length;
  const remaining = active.length - got;
  const percent = active.length === 0 ? 0 : Math.round((got / active.length) * 100);

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link href={`/plans/${week}`} className="text-sm text-muted hover:text-foreground">
          ← Week of {formatWeekRange(week)}
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="display text-3xl">Shopping list</h1>
          <p className="mt-1 text-sm text-muted">
            Week of {formatWeekRange(week)} ·{" "}
            {remaining === 0 ? "all done 🎉" : `${remaining} to get`}
          </p>
        </div>
        <form action={clearCheckedItems.bind(null, week)} className="no-print">
          <button type="submit" className="btn-ghost">
            Uncheck all
          </button>
        </form>
      </div>

      {active.length > 0 && (
        <div className="no-print">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunk"
            role="progressbar"
            aria-valuenow={got}
            aria-valuemin={0}
            aria-valuemax={active.length}
            aria-label="Shopping progress"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {got} of {active.length} in the cart
          </p>
        </div>
      )}

      <CopyButtons
        formats={[
          {
            id: "trello-shopping",
            label: "Copy for Trello",
            hint: "Still-needed items, one per line — Trello makes one card per line",
            text: shoppingForTrello(items),
          },
          {
            id: "text-shopping",
            label: "Copy as text",
            hint: "The whole list grouped by aisle, for Messages or Notes",
            text: shoppingAsText(week, items),
          },
          {
            id: "trello-plan",
            label: "Copy meals for Trello",
            hint: "One card per day of the week",
            text: planForTrello(week, days),
          },
        ]}
      />

      <p className="no-print text-xs text-muted">
        Items tagged <span className="chip-accent">every week</span> are on every list.{" "}
        <Link href="/pantry" className="text-accent underline underline-offset-2">
          Edit what you buy weekly
        </Link>
      </p>

      <div className="card p-6">
        <ShoppingList
          groups={groups}
          actions={{
            toggleChecked: async (itemKey: string, checked: boolean) => {
              "use server";
              await toggleItemChecked(week, itemKey, checked);
            },
            toggleExcluded: async (itemKey: string, excluded: boolean) => {
              "use server";
              await toggleItemExcluded(week, itemKey, excluded);
            },
          }}
        />
      </div>

      <PantryCheck
        items={pantryCheck}
        onAdd={async (itemKey: string) => {
          "use server";
          await toggleItemExcluded(week, itemKey, false);
        }}
      />

      <section className="no-print card p-6">
        <h2 className="mb-4 display text-lg">Add something else</h2>
        <form
          action={addExtraItem.bind(null, week)}
          className="grid gap-3 sm:grid-cols-[1fr_5rem_7rem_9rem_auto]"
        >
          <input
            name="label"
            required
            className="input"
            placeholder="Birthday candles"
            aria-label="Item"
          />
          <input
            name="quantity"
            className="input"
            placeholder="qty"
            inputMode="decimal"
            aria-label="Quantity"
          />
          <select name="unit" className="input" aria-label="Unit" defaultValue="">
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u || "—"}
              </option>
            ))}
          </select>
          <select
            name="category"
            className="input"
            aria-label="Category"
            defaultValue="other"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>

        {items.some((i) => i.isExtra) && (
          <ul className="mt-4 divide-y divide-line text-sm">
            {items
              .filter((i) => i.isExtra)
              .map((item) => (
                <li key={item.key} className="flex items-center justify-between py-2">
                  <span>
                    {item.name}
                    {item.amount && <span className="text-muted"> · {item.amount}</span>}
                  </span>
                  <form
                    action={removeExtraItem.bind(
                      null,
                      week,
                      Number(item.key.replace("extra:", "")),
                    )}
                  >
                    <button type="submit" className="text-xs text-muted hover:text-warn">
                      remove
                    </button>
                  </form>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
