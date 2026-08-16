import { requireUser } from "@/lib/auth";
import { listIngredients } from "@/lib/recipes";
import { CATEGORIES, categoryIcon, categoryRank } from "@/lib/categories";
import { UNIT_OPTIONS } from "@/lib/units";
import {
  addStaple,
  createIngredient,
  deleteIngredient,
  removeStaple,
  updateIngredient,
  updateStapleAmount,
} from "./actions";

export default async function PantryPage() {
  await requireUser();
  const ingredients = await listIngredients();
  const staples = ingredients.filter((i) => i.isStaple);

  const sorted = [...ingredients].sort(
    (a, b) =>
      categoryRank(a.category) - categoryRank(b.category) ||
      a.name.localeCompare(b.name),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-3xl">Pantry</h1>
        <p className="mt-1 text-sm text-muted">
          Your every-week shopping items, plus every ingredient your recipes use.
        </p>
      </div>

      <section className="card p-6">
        <h2 className="display text-lg">Buy every week</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          These go on every shopping list automatically, whatever you&apos;ve planned —
          milk, bread, eggs, coffee, paper towels.
        </p>

        {staples.length === 0 ? (
          <p className="mb-4 rounded-xl bg-surface-sunk px-4 py-6 text-center text-sm text-muted">
            Nothing yet. Add your first below.
          </p>
        ) : (
          <ul className="mb-5 divide-y divide-line border-y border-line">
            {staples.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <span aria-hidden className="text-base">
                  {categoryIcon(s.category)}
                </span>
                <span className="flex-1 truncate font-medium">{s.name}</span>

                <form
                  action={updateStapleAmount.bind(null, s.id)}
                  className="flex items-center gap-2"
                >
                  <input
                    name="quantity"
                    defaultValue={s.stapleQuantity ? String(Number(s.stapleQuantity)) : ""}
                    className="input w-16 px-2 py-1 text-center"
                    placeholder="qty"
                    inputMode="decimal"
                    aria-label={`Weekly quantity for ${s.name}`}
                  />
                  <select
                    name="unit"
                    defaultValue={s.stapleUnit ?? ""}
                    className="input w-24 px-2 py-1"
                    aria-label={`Unit for ${s.name}`}
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u || "—"}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn-ghost px-2 py-1 text-xs">
                    Save
                  </button>
                </form>

                <form action={removeStaple.bind(null, s.id)}>
                  <button
                    type="submit"
                    className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-warn-soft hover:text-warn"
                    aria-label={`Stop buying ${s.name} every week`}
                  >
                    remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={addStaple}
          className="grid gap-2 sm:grid-cols-[1fr_4.5rem_6rem_9rem_auto]"
        >
          <input
            name="name"
            required
            list="all-ingredients"
            className="input"
            placeholder="Add an every-week item…"
            aria-label="Item name"
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
            aria-label="Grocery aisle"
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
        <datalist id="all-ingredients">
          {ingredients.map((i) => (
            <option key={i.id} value={i.name} />
          ))}
        </datalist>
      </section>

      <div>
        <h2 className="display text-xl">All ingredients</h2>
        <p className="mt-1 text-sm text-muted">
          Everything your recipes use. Set an aisle so the shopping list sorts sensibly.
        </p>
      </div>

      <form action={createIngredient} className="card grid gap-3 p-6 sm:grid-cols-[1fr_auto_auto_auto]">
        <input
          name="name"
          required
          className="input"
          placeholder="Add an ingredient (e.g. milk)"
          aria-label="Ingredient name"
        />
        <select name="category" className="input" aria-label="Category" defaultValue="other">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 px-1 text-sm">
          <input type="checkbox" name="isStaple" className="size-4 accent-[var(--accent)]" />
          Staple
        </label>
        <button type="submit" className="btn-primary">
          Add
        </button>
      </form>

      {sorted.length > 0 && (
        <div className="card divide-y divide-line">
          {sorted.map((ing) => (
            <form
              key={ing.id}
              action={updateIngredient.bind(null, ing.id)}
              className="grid grid-cols-2 items-center gap-3 p-4 sm:grid-cols-[1fr_10rem_5rem_7rem_auto_auto]"
            >
              <div className="col-span-2 flex items-center gap-2.5 sm:col-span-1">
                <span aria-hidden className="text-base">
                  {categoryIcon(ing.category)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{ing.name}</p>
                  <p className="text-xs text-muted">
                    {ing.usedIn === 0
                      ? "not used in any recipe"
                      : `in ${ing.usedIn} recipe${ing.usedIn === 1 ? "" : "s"}`}
                  </p>
                </div>
              </div>

              <select
                name="category"
                defaultValue={ing.category}
                className="input"
                aria-label={`Category for ${ing.name}`}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <input
                name="stapleQuantity"
                defaultValue={ing.stapleQuantity ? String(Number(ing.stapleQuantity)) : ""}
                className="input"
                placeholder="qty"
                inputMode="decimal"
                aria-label={`Weekly quantity for ${ing.name}`}
              />

              <select
                name="stapleUnit"
                defaultValue={ing.stapleUnit ?? ""}
                className="input"
                aria-label={`Weekly unit for ${ing.name}`}
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u || "—"}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isStaple"
                  defaultChecked={ing.isStaple}
                  className="size-4 accent-[var(--accent)]"
                />
                Staple
              </label>

              <div className="flex items-center gap-2">
                <button type="submit" className="btn-secondary">
                  Save
                </button>
                {ing.usedIn === 0 && (
                  <button
                    type="submit"
                    formAction={deleteIngredient.bind(null, ing.id)}
                    className="text-xs text-muted hover:text-warn"
                  >
                    delete
                  </button>
                )}
              </div>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
