import { requireUser } from "@/lib/auth";
import { logout } from "../login/actions";
import NavLink from "@/components/nav-link";

const LINKS = [
  { href: "/", label: "This week" },
  { href: "/recipes", label: "Recipes" },
  { href: "/plans", label: "Plans" },
  { href: "/pantry", label: "Pantry" },
  { href: "/settings", label: "Settings" },
];

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
          <span
            className="mr-2 flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-lg"
            aria-hidden
          >
            🍲
          </span>
          <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {LINKS.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <form action={logout}>
            <button
              type="submit"
              className="group flex shrink-0 items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-surface-sunk"
              title={`Signed in as ${user.email} — click to sign out`}
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden text-muted group-hover:text-foreground sm:inline">
                Sign out
              </span>
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">{children}</main>
    </div>
  );
}
