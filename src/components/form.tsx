"use client";

import type { SelectHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { CATEGORIES } from "@/lib/categories";
import { SUPPLY, SUPPLY_LABELS } from "@/lib/supply";
import { UNIT_OPTIONS } from "@/lib/units";

/** Submit button that disables itself and swaps its label while the form is pending. */
export function SubmitButton({
  label,
  pendingLabel = "Saving…",
  className = "btn-primary",
}: {
  label: string;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

/** Error or success line under a form, from a useActionState result. */
export function FormMessage({ state }: { state: { error?: string; ok?: string } }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p role="status" className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
        {state.ok}
      </p>
    );
  }
  return null;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function UnitSelect({ className = "input", ...props }: SelectProps) {
  return (
    <select className={className} {...props}>
      {UNIT_OPTIONS.map((u) => (
        <option key={u} value={u}>
          {u || "—"}
        </option>
      ))}
    </select>
  );
}

export function CategorySelect({ className = "input", ...props }: SelectProps) {
  return (
    <select className={className} {...props}>
      {CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

export function SupplySelect({ className = "input", ...props }: SelectProps) {
  return (
    <select className={className} {...props}>
      {SUPPLY.map((s) => (
        <option key={s} value={s}>
          {SUPPLY_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
