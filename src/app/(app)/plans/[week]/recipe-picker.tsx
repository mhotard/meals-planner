"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { MutationResult } from "@/lib/form";
import { relativeDays, toISODate } from "@/lib/dates";

export type PickerRecipe = {
  id: number;
  name: string;
  description: string | null;
  prepMinutes: number | null;
  timesCooked: number;
  lastCookedOn: string | null;
};

type Filter = "all" | "never" | "rested" | "quick";
type Sort = "name" | "rested" | "quick" | "most";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "rested", label: "Not made lately" },
  { id: "never", label: "Never made" },
  { id: "quick", label: "30 min or less" },
];

const SORTS: { id: Sort; label: string }[] = [
  { id: "name", label: "A–Z" },
  { id: "rested", label: "Longest since made" },
  { id: "quick", label: "Quickest first" },
  { id: "most", label: "Made most often" },
];

const QUICK_MINUTES = 30;
const RESTED_DAYS = 30;

function daysSince(iso: string | null, today: string): number | null {
  if (!iso) return null;
  return Math.round(
    (new Date(today).getTime() - new Date(iso).getTime()) / 86_400_000,
  );
}

export default function RecipePicker({
  dayLabel,
  dayDate,
  recipes,
  plannedRecipeIds,
  onPickRecipe,
  onPickCustom,
}: {
  dayLabel: string;
  dayDate: string;
  recipes: PickerRecipe[];
  /** Already on this week's plan — flagged so you don't repeat by accident. */
  plannedRecipeIds: number[];
  onPickRecipe: (recipeId: number) => Promise<MutationResult | void>;
  onPickCustom: (label: string) => Promise<MutationResult | void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("name");
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();

  const today = toISODate(new Date());
  const planned = useMemo(() => new Set(plannedRecipeIds), [plannedRecipeIds]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    const matched = recipes.filter((r) => {
      if (q && !`${r.name} ${r.description ?? ""}`.toLowerCase().includes(q)) {
        return false;
      }
      const since = daysSince(r.lastCookedOn, today);
      if (filter === "never") return r.timesCooked === 0;
      if (filter === "quick") return r.prepMinutes != null && r.prepMinutes <= QUICK_MINUTES;
      if (filter === "rested") return since == null || since >= RESTED_DAYS;
      return true;
    });

    const byName = (a: PickerRecipe, b: PickerRecipe) => a.name.localeCompare(b.name);

    return matched.sort((a, b) => {
      if (sort === "rested") {
        // Never-made first, then longest since we last cooked it.
        const sa = daysSince(a.lastCookedOn, today) ?? Number.POSITIVE_INFINITY;
        const sb = daysSince(b.lastCookedOn, today) ?? Number.POSITIVE_INFINITY;
        return sb - sa || byName(a, b);
      }
      if (sort === "quick") {
        const pa = a.prepMinutes ?? Number.POSITIVE_INFINITY;
        const pb = b.prepMinutes ?? Number.POSITIVE_INFINITY;
        return pa - pb || byName(a, b);
      }
      if (sort === "most") return b.timesCooked - a.timesCooked || byName(a, b);
      return byName(a, b);
    });
  }, [recipes, query, filter, sort, today]);

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function show() {
    setError(undefined);
    setQuery("");
    setFilter("all");
    setActive(0);
    setOpen(true);
    dialogRef.current?.showModal();
  }

  function hide() {
    dialogRef.current?.close();
    setOpen(false);
  }

  function pick(recipeId: number) {
    startTransition(async () => {
      const result = await onPickRecipe(recipeId);
      setError(result?.error);
      if (!result?.error) hide();
    });
  }

  function pickCustom() {
    const label = query.trim();
    if (!label) return;
    startTransition(async () => {
      const result = await onPickCustom(label);
      setError(result?.error);
      if (!result?.error) hide();
    });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) pick(results[active].id);
      else pickCustom();
    }
  }

  return (
    <>
      <button type="button" onClick={show} className="btn-secondary w-full sm:w-auto">
        + Add a meal
      </button>

      {/* m-auto: Tailwind's preflight zeroes the margin that centres a modal dialog. */}
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        aria-label={`Add a meal to ${dayLabel}`}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-foreground shadow-[var(--shadow-md)] backdrop:bg-foreground/40 backdrop:backdrop-blur-[2px]"
      >
        {open && (
          <div className="flex max-h-[80vh] flex-col">
            <div className="border-b border-line p-4">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <p className="display text-lg">
                  {dayLabel}{" "}
                  <span className="text-sm font-normal text-muted">{dayDate}</span>
                </p>
                <button
                  type="button"
                  onClick={hide}
                  className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-surface-sunk"
                >
                  Esc
                </button>
              </div>

              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                className="input"
                placeholder="Search recipes, or type anything…"
                aria-label="Search recipes"
              />

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setFilter(f.id);
                      setActive(0);
                    }}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      filter === f.id
                        ? "bg-accent text-white"
                        : "border border-line text-muted hover:bg-surface-sunk"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as Sort);
                    setActive(0);
                  }}
                  className="ml-auto rounded-lg border border-line bg-surface px-2 py-1 text-xs text-muted"
                  aria-label="Sort recipes"
                >
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <ul
              ref={listRef}
              className={`min-h-0 flex-1 overflow-y-auto p-2 ${pending ? "opacity-60" : ""}`}
            >
              {results.map((r, i) => {
                const already = planned.has(r.id);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => pick(r.id)}
                      onMouseEnter={() => setActive(i)}
                      aria-current={i === active}
                      className={`flex w-full items-baseline gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        i === active ? "bg-accent-soft" : ""
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{r.name}</span>
                        {already && (
                          <span className="ml-2 chip text-muted">already this week</span>
                        )}
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {r.lastCookedOn
                            ? `made ${relativeDays(r.lastCookedOn)}`
                            : "never made"}
                          {r.prepMinutes ? ` · ${r.prepMinutes} min` : ""}
                          {r.description ? ` · ${r.description}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}

              {results.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted">
                  {query.trim() ? (
                    <>
                      No recipe matches “{query.trim()}”.
                      <br />
                      Press Enter to add it as a one-off.
                    </>
                  ) : (
                    "No recipes match those filters."
                  )}
                </li>
              )}
            </ul>

            <div className="border-t border-line p-3">
              {error && <p role="alert" className="text-sm text-warn">{error}</p>}
              <button
                type="button"
                onClick={pickCustom}
                disabled={!query.trim() || pending}
                className="btn-ghost w-full justify-start text-sm disabled:opacity-40"
              >
                {query.trim()
                  ? `Add “${query.trim()}” as a one-off`
                  : "Type to add leftovers, takeout, anything"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
