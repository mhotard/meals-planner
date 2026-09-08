"use client";

import { useOptimistic, useTransition } from "react";
import { categoryIcon } from "@/lib/categories";
import type { ShoppingItem } from "@/lib/shopping";

type Actions = {
  toggleChecked: (itemKey: string, checked: boolean) => Promise<void>;
  toggleExcluded: (itemKey: string, excluded: boolean) => Promise<void>;
};

function Row({ item, actions }: { item: ShoppingItem; actions?: Actions }) {
  const [pending, startTransition] = useTransition();
  // Optimistic so tapping through a list in the store feels instant; falls
  // back to the server value once the action settles or the page refreshes.
  const [checked, setChecked] = useOptimistic(item.checked);

  const readOnly = !actions;

  return (
    <li
      className={`group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors sm:py-2 ${
        item.excluded ? "opacity-40" : "hover:bg-surface-sunk/60"
      } ${pending ? "opacity-60" : ""}`}
    >
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={readOnly || item.excluded}
          onChange={(e) => {
            const next = e.target.checked;
            startTransition(async () => {
              setChecked(next);
              await actions?.toggleChecked(item.key, next);
            });
          }}
          className="size-5 shrink-0 rounded accent-[var(--accent)] sm:size-4"
          aria-label={`Got ${item.name}`}
        />

        <span className="min-w-0 flex-1 text-sm">
          <span
            className={`font-medium transition-colors ${
              checked ? "text-muted line-through" : ""
            }`}
          >
            {item.name}
          </span>
          {item.amount && (
            <span className={`ml-2 tabular-nums ${checked ? "text-muted/70" : "text-muted"}`}>
              {item.amount}
            </span>
          )}
          {item.supply === "weekly" && (
            <span className="ml-2 align-middle chip-accent" title="Bought every week">
              every week
            </span>
          )}
          {item.fromRecipes.length > 0 && (
            <span className="mt-0.5 hidden truncate text-xs text-muted/80 sm:block">
              {item.fromRecipes.join(" · ")}
            </span>
          )}
        </span>
      </label>

      {!readOnly && (
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await actions.toggleExcluded(item.key, !item.excluded);
            })
          }
          className="no-print shrink-0 rounded-lg px-2 py-1 text-xs text-muted opacity-0 transition-opacity hover:bg-warn-soft hover:text-warn focus:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
        >
          {item.excluded
            ? "restore"
            : item.supply === "pantry"
              ? "have it"
              : "skip"}
        </button>
      )}
    </li>
  );
}

export default function ShoppingList({
  groups,
  actions,
}: {
  groups: [string, ShoppingItem[]][];
  actions?: Actions;
}) {
  if (groups.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-3xl">🧺</p>
        <p className="mt-2 text-sm text-muted">
          Nothing on the list yet — add some meals to the week.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {groups.map(([category, items]) => (
        <section key={category}>
          <h3 className="mb-2 flex items-center gap-2 border-b border-line pb-1.5 eyebrow">
            <span aria-hidden>{categoryIcon(category)}</span>
            {category}
            <span className="ml-auto font-normal normal-case tracking-normal text-muted/70">
              {items.length}
            </span>
          </h3>
          <ul className="-mx-2">
            {items.map((item) => (
              <Row key={item.key} item={item} actions={actions} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
