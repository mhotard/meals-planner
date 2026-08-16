import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getRecipe } from "@/lib/recipes";
import { formatAmount } from "@/lib/units";
import { formatDate, relativeDays, toISODate } from "@/lib/dates";
import { deleteCookLog, logCooked, updateRecipeNotes } from "../actions";
import NotesEditor from "./notes-editor";

export default async function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  await requireUser();
  const { id } = await params;
  const recipeId = Number(id);
  if (!Number.isInteger(recipeId)) notFound();

  const data = await getRecipe(recipeId);
  if (!data) notFound();

  const { recipe, ingredients, logs } = data;
  const today = toISODate(new Date());

  return (
    <div className="space-y-6">
      <div>
        <Link href="/recipes" className="text-sm text-muted hover:text-foreground">
          ← Recipes
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="display text-3xl leading-tight">{recipe.name}</h1>
            {recipe.description && (
              <p className="mt-1.5 text-muted">{recipe.description}</p>
            )}
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              {recipe.servings && <span>Serves {recipe.servings}</span>}
              {recipe.prepMinutes && (
                <>
                  <span aria-hidden className="text-line-strong">
                    •
                  </span>
                  <span>{recipe.prepMinutes} min</span>
                </>
              )}
              {logs.length > 0 && (
                <>
                  <span aria-hidden className="text-line-strong">
                    •
                  </span>
                  <span className="text-accent">
                    made {logs.length}×, last {relativeDays(logs[0].cookedOn)}
                  </span>
                </>
              )}
              {recipe.sourceUrl && (
                <>
                  <span aria-hidden className="text-line-strong">
                    •
                  </span>
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
                  >
                    source ↗
                  </a>
                </>
              )}
            </p>
          </div>
          <Link href={`/recipes/${recipe.id}/edit`} className="btn-secondary">
            Edit
          </Link>
        </div>
      </div>

      <section className="card p-6">
        <h2 className="mb-4 display text-lg">Ingredients</h2>
        {ingredients.length === 0 ? (
          <p className="text-sm text-muted">No ingredients listed yet.</p>
        ) : (
          <ul className="-mx-2">
            {ingredients.map((ing) => (
              <li
                key={ing.id}
                className="flex items-baseline gap-4 rounded-lg px-2 py-2 text-sm hover:bg-surface-sunk/60"
              >
                <span className="w-20 shrink-0 text-right font-medium tabular-nums text-accent">
                  {formatAmount(ing.quantity ? Number(ing.quantity) : null, ing.unit)}
                </span>
                <span className="flex-1">
                  {ing.name}
                  {ing.note && <span className="text-muted"> — {ing.note}</span>}
                </span>
                {ing.isStaple && <span className="chip-accent shrink-0">staple</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <NotesEditor
        recipeId={recipe.id}
        notes={recipe.notes ?? ""}
        action={updateRecipeNotes.bind(null, recipe.id)}
      />

      <section className="card p-6">
        <h2 className="mb-1 display text-lg">We had this</h2>
        <p className="mb-4 text-sm text-muted">
          Log a night you made it, so you can see what&apos;s in rotation.
        </p>

        <form
          action={logCooked.bind(null, recipe.id)}
          className="mb-6 grid gap-3 sm:grid-cols-[auto_auto_1fr_auto]"
        >
          <input
            type="date"
            name="cookedOn"
            defaultValue={today}
            className="input"
            aria-label="Date we made it"
          />
          <select name="rating" className="input" aria-label="Rating" defaultValue="">
            <option value="">Rating…</option>
            <option value="3">Loved it</option>
            <option value="2">Fine</option>
            <option value="1">Not again</option>
          </select>
          <input
            name="note"
            className="input"
            placeholder="How did it go?"
            aria-label="Note"
          />
          <button type="submit" className="btn-primary">
            Log it
          </button>
        </form>

        {logs.length === 0 ? (
          <p className="text-sm text-muted">Never logged.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {logs.map((log) => (
              <li key={log.id} className="flex items-baseline gap-3 py-2.5 text-sm">
                <span className="w-28 shrink-0 font-medium tabular-nums">
                  {formatDate(log.cookedOn)}
                </span>
                <span className="flex-1">
                  {log.rating != null && (
                    <span className="mr-1.5 text-accent" title={`${log.rating} of 3`}>
                      {"★".repeat(log.rating)}
                      <span className="text-line-strong">{"★".repeat(3 - log.rating)}</span>
                    </span>
                  )}
                  {log.note}
                  {log.userName && <span className="text-muted"> · {log.userName}</span>}
                </span>
                <form action={deleteCookLog.bind(null, log.id, recipe.id)}>
                  <button
                    type="submit"
                    className="text-xs text-muted hover:text-warn"
                    aria-label={`Remove log from ${formatDate(log.cookedOn)}`}
                  >
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
