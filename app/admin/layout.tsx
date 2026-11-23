import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/site/logo";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const NAV = [
  ["/admin", "Overzicht"],
  ["/admin/wallets", "Wallets & labels"],
  ["/admin/settings", "Instellingen"],
  ["/app", "← App"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-8 px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-3"><Logo /><span className="num rounded-[4px] border border-amber/50 px-1.5 text-[11px] text-amber">ADMIN</span></Link>
          <nav className="flex gap-1 overflow-x-auto text-sm">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="shrink-0 rounded-md px-3 py-2 text-ink-2 hover:bg-surface hover:text-ink">{label}</Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
