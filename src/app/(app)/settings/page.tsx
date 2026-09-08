import { requireUser } from "@/lib/auth";
import { listMembers } from "@/lib/users";
import { AddMemberForm, PasswordForm } from "./forms";

export default async function SettingsPage() {
  const me = await requireUser();
  const members = await listMembers();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted">Signed in as {me.email}</p>
      </div>

      <section className="card p-6">
        <h2 className="mb-1 display text-lg">Household</h2>
        <p className="mb-4 text-sm text-muted">
          Everyone here shares the same recipes, plans, and shopping lists.
        </p>
        <ul className="mb-6 divide-y divide-line rounded-lg border border-line">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-medium">{m.name}</span>
              <span className="text-muted">{m.email}</span>
            </li>
          ))}
        </ul>
        <AddMemberForm />
      </section>

      <section className="card p-6">
        <h2 className="mb-4 display text-lg">Change your password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
