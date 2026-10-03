"use client";

import ActionForm from "@/components/action-form";

import { deleteRecipe } from "../../actions";

export default function DeleteRecipeButton({
  recipeId,
  name,
}: {
  recipeId: number;
  name: string;
}) {
  return (
    <ActionForm
      action={deleteRecipe.bind(null, recipeId)}
      onSubmit={(e) => {
        if (!confirm(`Delete “${name}” and its history?`)) e.preventDefault();
      }}
    >
      <button type="submit" className="btn border border-warn/40 text-warn hover:bg-warn/10">
        Delete recipe
      </button>
    </ActionForm>
  );
}
