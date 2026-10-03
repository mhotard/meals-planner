import ActionForm from "@/components/action-form";
import { requireUser } from "@/server/auth";
import { listIngredients } from "@/server/recipes";
import { categoryIcon, categoryRank } from "@/lib/categories";
import { CategorySelect, SupplySelect, UnitSelect } from "@/components/form";
import {
  addPantryItem,
  addWeeklyItem,
  createIngredient,
  deleteIngredient,
  setSupply,
  updateIngredient,
  updateWeeklyAmount,
} from "./actions";

export default async function PantryPage() {
  await requireUser();
  const ingredients = await listIngredients();

  const weekly = ingredients.filter((i) => i.supply === "weekly");
  const pantry = ingredients.filter((i) => i.supply === "pantry");

  const sorted = [...ingredients].sort(
    (a, b) =>
      categoryRank(a.category) - categoryRank(b.category) ||
      a.name.localeCompare(b.name),
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="display text-3xl">Shopping</h1>
        <p className="mt-1 text-sm text-muted">
          What you buy every week, what lives in the cupboard, and everything your
          recipes use.
        </p>
      </div>

      {/* ---------------------------------------------------------------- */}
      <section className="card p-6">
        <h2 className="display text-lg">Every week</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          On every shopping list automatically, whatever you&apos;ve planned — milk,
          bread, eggs.
        </p>

        {weekly.length === 0 ? (
          <p className="mb-4 rounded-xl bg-surface-sunk px-4 py-6 text-center text-sm text-muted">
            Nothing yet. Add your first below.
          </p>
        ) : (
          <ul className="mb-5 divide-y divide-line border-y border-line">
            {weekly.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2.5">
                <span aria-hidden className="text-base">
                  {categoryIcon(item.category)}
                </span>
                <span className="flex-1 truncate font-medium">{item.name}</span>

                <ActionForm
                  action={updateWeeklyAmount.bind(null, item.id)}
                  className="flex items-center gap-2"
                >
                  <input
                    name="quantity"
                    defaultValue={
                      item.weeklyQuantity ? String(Number(item.weeklyQuantity)) : ""
                    }
                    className="input w-16 px-2 py-1 text-center"
                    placeholder="qty"
                    inputMode="decimal"
                    aria-label={`Weekly quantity for ${item.name}`}
                  />
                  <UnitSelect
                    name="unit"
                    defaultValue={item.weeklyUnit ?? ""}
                    className="input w-24 px-2 py-1"
                    aria-label={`Unit for ${item.name}`}
                  />
                  <button type="submit" className="btn-ghost px-2 py-1 text-xs">
                    Save
                  </button>
                </ActionForm>

                <ActionForm action={setSupply.bind(null, item.id, "pantry")}>
                  <button
                    type="submit"
                    className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-accent-soft hover:text-accent"
                    title="Move to the pantry list"
                  >
                    → pantry
                  </button>
                </ActionForm>
                <ActionForm action={setSupply.bind(null, item.id, "per_recipe")}>
                  <button
                    type="submit"
                    className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-warn-soft hover:text-warn"
                    aria-label={`Stop buying ${item.name} every week`}
                  >
                    remove
                  </button>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}

        <ActionForm action={addWeeklyItem} className="grid gap-2 sm:grid-cols-[1fr_4.5rem_6rem_9rem_auto]">
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
          <UnitSelect name="unit" aria-label="Unit" defaultValue="" />
          <CategorySelect name="category" aria-label="Grocery aisle" defaultValue="other" />
          <button type="submit" className="btn-primary">
            Add
          </button>
        </ActionForm>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="card p-6">
        <h2 className="display text-lg">Pantry</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Kept in stock and replaced every few weeks — olive oil, rice, spices. These
          stay <em>off</em> your shopping list. When a recipe needs one, it shows up
          under “check the pantry” so you can add it if you&apos;re running low.
        </p>

        {pantry.length === 0 ? (
          <p className="mb-4 rounded-xl bg-surface-sunk px-4 py-6 text-center text-sm text-muted">
            Nothing yet. Add the things you keep in the cupboard.
          </p>
        ) : (
          <ul className="mb-5 flex flex-wrap gap-2">
            {pantry.map((item) => (
              <li key={item.id}>
                <span className="flex items-center gap-2 rounded-xl border border-line-strong px-3 py-1.5 text-sm">
                  <span aria-hidden>{categoryIcon(item.category)}</span>
                  {item.name}
                  <ActionForm action={setSupply.bind(null, item.id, "per_recipe")}>
                    <button
                      type="submit"
                      className="text-xs text-muted hover:text-warn"
                      aria-label={`Remove ${item.name} from the pantry list`}
                    >
                      ✕
                    </button>
                  </ActionForm>
                </span>
              </li>
            ))}
          </ul>
        )}

        <ActionForm action={addPantryItem} className="grid gap-2 sm:grid-cols-[1fr_9rem_auto]">
          <input
            name="name"
            required
            list="all-ingredients"
            className="input"
            placeholder="Add a pantry item…"
            aria-label="Pantry item name"
          />
          <CategorySelect name="category" aria-label="Grocery aisle" defaultValue="other" />
          <button type="submit" className="btn-secondary">
            Add
          </button>
        </ActionForm>
      </section>

      {/* ---------------------------------------------------------------- */}
      <div>
        <h2 className="display text-xl">All ingredients</h2>
        <p className="mt-1 text-sm text-muted">
          Everything your recipes use. Set the aisle so the shopping list sorts the way
          you walk the store.
        </p>
      </div>

      <ActionForm
        action={createIngredient}
        className="card grid gap-3 p-6 sm:grid-cols-[1fr_auto_auto_auto]"
      >
        <input
          name="name"
          required
          className="input"
          placeholder="Add an ingredient (e.g. tahini)"
          aria-label="Ingredient name"
        />
        <CategorySelect name="category" aria-label="Category" defaultValue="other" />
        <SupplySelect name="supply" aria-label="How often" defaultValue="per_recipe" />
        <button type="submit" className="btn-primary">
          Add
        </button>
      </ActionForm>

      {sorted.length > 0 && (
        <div className="card divide-y divide-line">
          {sorted.map((ing) => (
            <div key={ing.id}>
              <ActionForm
                action={updateIngredient.bind(null, ing.id)}
                className="grid grid-cols-2 items-center gap-3 p-4 sm:grid-cols-[1fr_10rem_14rem_auto]"
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

                <CategorySelect
                  name="category"
                  defaultValue={ing.category}
                  aria-label={`Aisle for ${ing.name}`}
                />

                <SupplySelect
                  name="supply"
                  defaultValue={ing.supply}
                  aria-label={`How often you buy ${ing.name}`}
                />

                <div className="flex items-center gap-2">
                  <button type="submit" className="btn-secondary">
                    Save
                  </button>

                </div>
              </ActionForm>
              {ing.usedIn === 0 && (
                <ActionForm action={deleteIngredient.bind(null, ing.id)} className="px-4 pb-3">
                  <button type="submit" className="text-xs text-muted hover:text-warn">delete</button>
                </ActionForm>
              )}
            </div>
          ))}
        </div>
      )}

      <datalist id="all-ingredients">
        {ingredients.map((i) => (
          <option key={i.id} value={i.name} />
        ))}
      </datalist>
    </div>
  );
}
