"use client";

import { useState } from "react";

export default function PlanNotes({
  notes,
  action,
}: {
  notes: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <section className="card p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="display text-lg">Week notes</h2>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="no-print text-sm text-accent hover:underline"
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
            rows={3}
            defaultValue={notes}
            autoFocus
            className="input resize-y"
            placeholder="Soccer Tuesday — needs to be fast. Guests Saturday."
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      ) : notes ? (
        <p className="whitespace-pre-wrap text-sm">{notes}</p>
      ) : (
        <p className="text-sm text-muted">No notes for this week.</p>
      )}
    </section>
  );
}
