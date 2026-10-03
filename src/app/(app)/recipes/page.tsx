import Link from "next/link";
import { requireUser } from "@/server/auth";
import { listRecipes } from "@/server/recipes";
import { relativeDays } from "@/lib/dates";

export default async function RecipesPage({ searchParams }: PageProps<"/recipes">) {
  await requireUser();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const recipes = await listRecipes(query);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-3xl">Recipes</h1>
          <p className="mt-1 text-sm text-muted">
            {recipes.length} in the collection
          </p>
        </div>
        <Link href="/recipes/new" className="btn-primary">
          + New recipe
        </Link>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          className="input"
          placeholder="Search recipes…"
          aria-label="Search recipes"
        />
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      {recipes.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl">{query ? "🔍" : "📖"}</p>
          <p className="mt-3 display text-lg">
            {query ? `Nothing matches “${query}”` : "No recipes yet"}
          </p>
          {!query && (
            <p className="mt-1 text-sm text-muted">
              Add the meals you cook often — everything else builds on these.
            </p>
          )}
          <Link href="/recipes/new" className="btn-primary mt-5">
            Add {query ? "a" : "your first"} recipe
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {recipes.map((r) => (
            <li key={r.id}>
              <Link
                href={`/recipes/${r.id}`}
                className="card group flex h-full flex-col p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[var(--shadow-md)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="display text-lg leading-snug group-hover:text-accent">
                    {r.name}
                  </h2>
                  {r.lastCookedOn && (
                    <span className="chip shrink-0">{relativeDays(r.lastCookedOn)}</span>
                  )}
                </div>

                {r.description && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted">{r.description}</p>
                )}

                <p className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-4 text-xs text-muted">
                  <span>{r.ingredientCount} ingredients</span>
                  {r.servings && (
                    <>
                      <span aria-hidden className="text-line-strong">
                        •
                      </span>
                      <span>serves {r.servings}</span>
                    </>
                  )}
                  {r.prepMinutes && (
                    <>
                      <span aria-hidden className="text-line-strong">
                        •
                      </span>
                      <span>{r.prepMinutes} min</span>
                    </>
                  )}
                  <span aria-hidden className="text-line-strong">
                    •
                  </span>
                  <span className={r.timesCooked > 0 ? "text-accent" : ""}>
                    {r.timesCooked > 0 ? `made ${r.timesCooked}×` : "never made"}
                  </span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
