"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Demandes" },
  { href: "/dashboard/agenda", label: "Agenda" },
  { href: "/dashboard/new", label: "Nouvelle demande" },
  { href: "/dashboard/settings", label: "Paramètres" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex gap-1 border-b border-zinc-800">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              active
                ? "border-accent text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-100"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
