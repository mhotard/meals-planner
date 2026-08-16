"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : "Save notes"}
    </button>
  );
}

export default function NotesEditor({
  notes,
  action,
}: {
  recipeId: number;
  notes: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <section className="card p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="display text-lg">Notes</h2>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm text-accent hover:underline"
          >
            {notes ? "Edit" : "Add a note"}
          </button>
        )}
      </div>

      {editing ? (
        <form
          action={async (formData) => {
            await action(formData);
            setEditing(false);
          }}
          className="space-y-3"
        >
          <textarea
            name="notes"
            rows={4}
            defaultValue={notes}
            autoFocus
            className="input resize-y"
            placeholder="Halve the chili next time. Great with rice."
          />
          <div className="flex gap-2">
            <SaveButton />
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : notes ? (
        <p className="whitespace-pre-wrap text-sm">{notes}</p>
      ) : (
        <p className="text-sm text-muted">No notes yet.</p>
      )}
    </section>
  );
}
