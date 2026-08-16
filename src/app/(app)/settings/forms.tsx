"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addMember, changePassword, type FormResult } from "./actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

function Feedback({ state }: { state: FormResult }) {
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

export function PasswordForm() {
  const [state, action] = useActionState<FormResult, FormData>(changePassword, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="current">
          Current password
        </label>
        <input id="current" name="current" type="password" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="next">
          New password
        </label>
        <input
          id="next"
          name="next"
          type="password"
          required
          minLength={8}
          className="input"
        />
      </div>
      <Feedback state={state} />
      <Submit label="Change password" />
    </form>
  );
}

export function AddMemberForm() {
  const [state, action] = useActionState<FormResult, FormData>(addMember, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="member-name">
            Name
          </label>
          <input id="member-name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="member-email">
            Email
          </label>
          <input id="member-email" name="email" type="email" required className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="member-password">
          Temporary password
        </label>
        <input
          id="member-password"
          name="password"
          type="text"
          required
          minLength={8}
          className="input"
          placeholder="They can change it after signing in"
        />
      </div>
      <Feedback state={state} />
      <Submit label="Add member" />
    </form>
  );
}
