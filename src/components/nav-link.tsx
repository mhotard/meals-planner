"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-accent-soft text-accent"
          : "text-muted hover:bg-surface-sunk hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
