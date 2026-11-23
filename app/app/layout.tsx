import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/site/logo";
import { AppNav } from "@/components/app/nav";
import { requireProfile, isAdminEmail } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const p = await requireProfile();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Naar de site"><Logo /></Link>
          <div className="flex items-center gap-3 text-sm">
            <span className={p.plan === "pro" ? "num rounded-[4px] bg-amber px-1.5 text-[11px] font-semibold text-amber-ink" : "num rounded-[4px] border border-line-strong px-1.5 text-[11px] text-ink-2"}>
              {p.plan === "pro" ? "PRO" : "FREE"}
            </span>
            <span className="hidden max-w-[200px] truncate text-ink-2 sm:inline">{p.email}</span>
            <form action="/auth/signout" method="post">
              <button className="text-ink-2 hover:text-ink">Uitloggen</button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1320px] gap-6 px-4 py-6 sm:px-6 md:grid-cols-[200px_1fr] md:gap-10 md:py-10">
        <aside className="md:sticky md:top-6 md:self-start">
          <AppNav admin={isAdminEmail(p.email)} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
