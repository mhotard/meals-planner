"use client";

import { useState } from "react";
import { SubmitButton } from "./form";

/** A notes card that reads as text and turns into a textarea on demand. */
export default function InlineNotes({
  title,
  notes,
  placeholder,
  emptyText = "No notes yet.",
  rows = 4,
  action,
}: {
  title: string;
  notes: string;
  placeholder: string;
  emptyText?: string;
  rows?: number;
  action: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <section className="card p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="display text-lg">{title}</h2>
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
            rows={rows}
            defaultValue={notes}
            autoFocus
            className="input resize-y"
            placeholder={placeholder}
          />
          <div className="flex gap-2">
            <SubmitButton label="Save" />
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      ) : notes ? (
        <p className="whitespace-pre-wrap text-sm">{notes}</p>
      ) : (
        <p className="text-sm text-muted">{emptyText}</p>
      )}
    </section>
  );
}
