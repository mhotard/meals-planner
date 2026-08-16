import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listIngredients } from "@/lib/recipes";
import RecipeForm from "../recipe-form";
import { createRecipe } from "../actions";

export default async function NewRecipePage() {
  await requireUser();
  const ingredients = await listIngredients();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/recipes" className="text-sm text-muted hover:text-foreground">
          ← Recipes
        </Link>
        <h1 className="mt-2 display text-3xl">New recipe</h1>
      </div>
      <RecipeForm
        action={createRecipe}
        submitLabel="Save recipe"
        cancelHref="/recipes"
        knownIngredients={ingredients.map((i) => i.name)}
        defaults={{
          name: "",
          description: "",
          notes: "",
          sourceUrl: "",
          servings: "",
          prepMinutes: "",
          ingredients: [],
        }}
      />
    </div>
  );
}
