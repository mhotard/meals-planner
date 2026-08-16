"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary shrink-0" disabled={pending}>
      {pending ? "Adding…" : "Add"}
    </button>
  );
}

/**
 * One row of the week: pick a recipe, or type something free-form like
 * "leftovers" or "pizza out".
 */
export default function DayPlanner({
  dayOfWeek,
  dayLabel,
  recipes,
  action,
}: {
  dayOfWeek: number;
  dayLabel: string;
  recipes: { id: number; name: string }[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [custom, setCustom] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
        setCustom(false);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="dayOfWeek" value={dayOfWeek} />

      {custom ? (
        <input
          name="customLabel"
          autoFocus
          className="input flex-1 min-w-40"
          placeholder="Leftovers, takeout, breakfast for dinner…"
          aria-label={`Custom meal for ${dayLabel}`}
        />
      ) : (
        <select
          name="recipeId"
          defaultValue=""
          className="input flex-1 min-w-40"
          aria-label={`Add a recipe to ${dayLabel}`}
        >
          <option value="">Add a recipe…</option>
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      )}

      <AddButton />
      <button
        type="button"
        onClick={() => setCustom((v) => !v)}
        className="btn-ghost shrink-0 text-xs"
      >
        {custom ? "pick a recipe" : "or type it"}
      </button>
    </form>
  );
}
