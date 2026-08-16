"use client";

import { deleteRecipe } from "../../actions";

export default function DeleteRecipeButton({
  recipeId,
  name,
}: {
  recipeId: number;
  name: string;
}) {
  return (
    <form
      action={deleteRecipe.bind(null, recipeId)}
      onSubmit={(e) => {
        if (!confirm(`Delete “${name}” and its history?`)) e.preventDefault();
      }}
    >
      <button type="submit" className="btn border border-warn/40 text-warn hover:bg-warn/10">
        Delete recipe
      </button>
    </form>
  );
}
