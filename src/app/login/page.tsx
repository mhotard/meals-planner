import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import LoginForm from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/");
  const { next } = await searchParams;

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16">
      {/* Soft warm wash behind the card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60rem 30rem at 50% -10%, var(--accent-soft), transparent 70%)",
        }}
      />
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-accent text-3xl shadow-[var(--shadow-md)]">
            🍲
          </div>
          <h1 className="display text-3xl">Meal Planner</h1>
          <p className="mt-1.5 text-sm text-muted">
            Recipes, weekly plans, shopping lists.
          </p>
        </div>
        <div className="card p-6">
          <LoginForm next={typeof next === "string" ? next : "/"} />
        </div>
      </div>
    </main>
  );
}
