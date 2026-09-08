"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { FormMessage, SubmitButton, UnitSelect } from "@/components/form";
import type { RecipeFormState } from "./actions";

export type IngredientRow = {
  name: string;
  quantity: string;
  unit: string;
  note: string;
};

const EMPTY_ROW: IngredientRow = { name: "", quantity: "", unit: "", note: "" };

export type RecipeDefaults = {
  name: string;
  description: string;
  notes: string;
  sourceUrl: string;
  servings: string;
  prepMinutes: string;
  ingredients: IngredientRow[];
};

export default function RecipeForm({
  action,
  defaults,
  knownIngredients,
  submitLabel,
  cancelHref,
}: {
  action: (state: RecipeFormState, formData: FormData) => Promise<RecipeFormState>;
  defaults: RecipeDefaults;
  knownIngredients: string[];
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState<RecipeFormState, FormData>(action, {});
  const [rows, setRows] = useState<IngredientRow[]>(
    defaults.ingredients.length ? defaults.ingredients : [EMPTY_ROW],
  );

  function update(index: number, patch: Partial<IngredientRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }

  function removeRow(index: number) {
    setRows((prev) => (prev.length === 1 ? [{ ...EMPTY_ROW }] : prev.filter((_, i) => i !== index)));
  }

  return (
    <form action={formAction} className="space-y-6">
      <datalist id="known-ingredients">
        {knownIngredients.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <section className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="name">
            Recipe name
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={defaults.name}
            className="input"
            placeholder="Sheet pan chicken thighs"
          />
        </div>
        <div>
          <label className="label" htmlFor="description">
            Short description
          </label>
          <input
            id="description"
            name="description"
            defaultValue={defaults.description}
            className="input"
            placeholder="Weeknight standby, one pan"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="servings">
              Serves
            </label>
            <input
              id="servings"
              name="servings"
              inputMode="numeric"
              defaultValue={defaults.servings}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="prepMinutes">
              Minutes
            </label>
            <input
              id="prepMinutes"
              name="prepMinutes"
              inputMode="numeric"
              defaultValue={defaults.prepMinutes}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="sourceUrl">
              Source link
            </label>
            <input
              id="sourceUrl"
              name="sourceUrl"
              type="url"
              defaultValue={defaults.sourceUrl}
              className="input"
              placeholder="https://"
            />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="display text-lg">Ingredients</h2>
          <p className="text-xs text-muted">New names are added to the pantry automatically</p>
        </div>

        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-12 items-center gap-2">
              <input
                aria-label="Quantity"
                name="ing-quantity"
                value={row.quantity}
                onChange={(e) => update(i, { quantity: e.target.value })}
                className="input col-span-3 sm:col-span-2"
                placeholder="2"
                inputMode="decimal"
              />
              <UnitSelect
                aria-label="Unit"
                name="ing-unit"
                value={row.unit}
                onChange={(e) => update(i, { unit: e.target.value })}
                className="input col-span-3 sm:col-span-2"
              />
              <input
                aria-label="Ingredient"
                name="ing-name"
                list="known-ingredients"
                value={row.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className="input col-span-6 sm:col-span-4"
                placeholder="chicken thighs"
              />
              <input
                aria-label="Prep note"
                name="ing-note"
                value={row.note}
                onChange={(e) => update(i, { note: e.target.value })}
                className="input col-span-11 sm:col-span-3"
                placeholder="boneless, skin on"
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="col-span-1 rounded-lg py-2 text-muted hover:text-warn"
                aria-label={`Remove ingredient ${i + 1}`}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addRow} className="btn-secondary mt-4">
          + Add ingredient
        </button>
      </section>

      <section className="card p-6">
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={defaults.notes}
          className="input resize-y"
          placeholder="Double the sauce. Kids skip the peppers."
        />
      </section>

      <FormMessage state={state} />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
        <Link href={cancelHref} className="btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
