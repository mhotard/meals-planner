"use client";

import { useTransition, useState } from "react";
import { categoryIcon } from "@/lib/categories";
import type { MutationResult } from "@/lib/form";
import type { ShoppingItem } from "@/lib/shopping";

/**
 * Pantry items this week's recipes call for. You almost certainly have them,
 * so they're a glance-and-move-on list rather than things to buy — one tap
 * moves anything you're low on onto the real shopping list.
 */
export default function PantryCheck({
  items,
  onAdd,
}: {
  items: ShoppingItem[];
  onAdd?: (itemKey: string) => Promise<MutationResult | void>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  if (items.length === 0) return null;

  return (
    <section className="card p-6">
      <h2 className="display text-lg">Check the pantry</h2>
      <p className="mt-1 mb-4 text-sm text-muted">
        This week&apos;s recipes use these. You probably have them — tap anything
        you&apos;re low on to move it onto the list.
      </p>

      {error && <p role="alert" className="mb-2 text-sm text-warn">{error}</p>}
      <ul className={`flex flex-wrap gap-2 ${pending ? "opacity-60" : ""}`}>
        {items.map((item) => (
          <li key={item.key}>
            {onAdd ? (
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    const result = await onAdd(item.key);
                    setError(result?.error);
                  })
                }
                className="group flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm transition-colors hover:border-accent/40 hover:bg-accent-soft"
                title={`Add ${item.name} to the shopping list`}
              >
                <span aria-hidden>{categoryIcon(item.category)}</span>
                <span className="font-medium">{item.name}</span>
                {item.amount && (
                  <span className="text-xs text-muted">{item.amount}</span>
                )}
                <span
                  aria-hidden
                  className="text-muted transition-colors group-hover:text-accent"
                >
                  +
                </span>
              </button>
            ) : (
              <span className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm">
                <span aria-hidden>{categoryIcon(item.category)}</span>
                <span className="font-medium">{item.name}</span>
                {item.amount && (
                  <span className="text-xs text-muted">{item.amount}</span>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
