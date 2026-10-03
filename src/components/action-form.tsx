"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ComponentProps } from "react";
import type { MutationResult } from "@/lib/form";

type Props = Omit<ComponentProps<"form">, "action"> & {
  action: (formData: FormData) => Promise<MutationResult | void>;
};

/** Forms retain their values after rejection and explain expected input errors. */
export default function ActionForm({ action, children, ...props }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const rejectedData = useRef<FormData | null>(null);
  const [state, formAction, pending] = useActionState<MutationResult, FormData>(
    async (_previous, data) => {
      const result = (await action(data)) ?? {};
      rejectedData.current = result.error ? data : null;
      return result;
    }, {},
  );
  // React resets uncontrolled forms after an action resolves. Restore rejected
  // input after that reset so a family member can correct just the bad field.
  useEffect(() => {
    if (pending || !state.error || !rejectedData.current || !formRef.current) return;
    const positions = new Map<string, number>();
    for (const element of Array.from(formRef.current.elements)) {
      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) || !element.name || element.type === "file") continue;
      const index = positions.get(element.name) ?? 0;
      positions.set(element.name, index + 1);
      const value = rejectedData.current.getAll(element.name)[index];
      if (typeof value === "string") element.value = value;
    }
  }, [state, pending]);
  return (
    <form {...props} ref={formRef} action={formAction} aria-busy={pending}>
      {children}
      {state.error && <p role="alert" className="col-span-full text-sm text-warn">{state.error}</p>}
    </form>
  );
}
