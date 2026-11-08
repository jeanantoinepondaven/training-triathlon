"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Week", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/progress", label: "Progress", icon: "M4 19V10M10 19V5M16 19v-6M22 19H2" },
  { href: "/cycles", label: "Cycles", icon: "M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:border-0 md:bg-transparent md:pb-0">
      <ul className="mx-auto flex max-w-2xl justify-around md:justify-start md:gap-1">
        {items.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <li key={it.href} className="flex-1 md:flex-none">
              <Link
                href={it.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium md:flex-row md:gap-2 md:rounded-lg md:px-3 md:text-sm ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={it.icon} />
                </svg>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
