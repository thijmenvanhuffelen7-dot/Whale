"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Eye, ScanSearch, UserRound, Shield } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/app", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/app/watchlist", label: "Watchlist", Icon: Eye },
  { href: "/app/analyse", label: "Analyse", Icon: ScanSearch },
  { href: "/app/account", label: "Account", Icon: UserRound },
];

export function AppNav({ admin }: { admin: boolean }) {
  const path = usePathname();
  const items = admin ? [...ITEMS, { href: "/admin", label: "Admin", Icon: Shield }] : ITEMS;
  return (
    <nav aria-label="App" className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map(({ href, label, Icon }) => {
        const active = href === "/app" ? path === "/app" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 shrink-0 items-center gap-2.5 rounded-[var(--radius-ctl)] px-3 text-sm transition-colors",
              active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface hover:text-ink",
            )}
          >
            <Icon className={cn("size-4", active ? "text-amber" : "")} strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
