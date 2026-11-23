import Link from "next/link";
import { Menu } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { ButtonLink } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { SITE } from "@/lib/site";

const NAV = [
  { href: "/feed", label: "Live feed" },
  { href: "/wallets", label: "Wallets" },
  { href: "/pricing", label: "Pricing" },
  { href: "/learn", label: "Learn" },
];

export async function SiteHeader() {
  const user = await getUser().catch(() => null);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" aria-label={`${SITE.name}, home`} className="shrink-0">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm text-ink-2 transition-colors hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <ButtonLink href="/app" size="sm">Dashboard</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="subtle" size="sm" className="hidden sm:inline-flex">Log in</ButtonLink>
              <ButtonLink href="/login?mode=signup" size="sm">Start free</ButtonLink>
            </>
          )}
          <details className="relative md:hidden">
            <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-md border border-line-strong text-ink-2 [&::-webkit-details-marker]:hidden" aria-label="Menu">
              <Menu className="size-4" />
            </summary>
            <nav className="absolute right-0 mt-2 flex w-52 flex-col rounded-[var(--radius-panel)] border border-line bg-surface p-1.5 shadow-[var(--shadow-overlay)]" aria-label="Mobile">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-md px-3 py-2.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink">
                  {n.label}
                </Link>
              ))}
              {!user && (
                <Link href="/login" className="rounded-md px-3 py-2.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink">Log in</Link>
              )}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
