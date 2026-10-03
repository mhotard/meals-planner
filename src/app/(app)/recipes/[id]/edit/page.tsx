import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { getRecipe, listIngredients } from "@/server/recipes";
import RecipeForm from "../../recipe-form";
import { updateRecipe } from "../../actions";
import DeleteRecipeButton from "./delete-button";

export default async function EditRecipePage({
  params,
}: PageProps<"/recipes/[id]/edit">) {
  await requireUser();
  const { id } = await params;
  const recipeId = Number(id);
  if (!Number.isInteger(recipeId)) notFound();

  const data = await getRecipe(recipeId);
  if (!data) notFound();

  const ingredients = await listIngredients();
  const action = updateRecipe.bind(null, recipeId);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/recipes/${recipeId}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← {data.recipe.name}
        </Link>
        <h1 className="mt-2 display text-3xl">Edit recipe</h1>
      </div>

      <RecipeForm
        action={action}
        submitLabel="Save changes"
        cancelHref={`/recipes/${recipeId}`}
        knownIngredients={ingredients.map((i) => i.name)}
        defaults={{
          name: data.recipe.name,
          description: data.recipe.description ?? "",
          notes: data.recipe.notes ?? "",
          sourceUrl: data.recipe.sourceUrl ?? "",
          servings: data.recipe.servings?.toString() ?? "",
          prepMinutes: data.recipe.prepMinutes?.toString() ?? "",
          ingredients: data.ingredients.map((i) => ({
            name: i.name,
            quantity: i.quantity == null ? "" : String(Number(i.quantity)),
            unit: i.unit ?? "",
            note: i.note ?? "",
          })),
        }}
      />

      <div className="card border-warn/30 p-6">
        <h2 className="font-semibold text-warn">Delete recipe</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Removes the recipe, its ingredient list, and its cook log. Can&apos;t be undone.
        </p>
        <DeleteRecipeButton recipeId={recipeId} name={data.recipe.name} />
      </div>
    </div>
  );
}
