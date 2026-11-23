import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { getLeaderboard, type WalletSort } from "@/lib/data";
import { ChainTag, WalletTypeTag } from "@/components/ui/tags";
import { Empty } from "@/components/ui/panel";
import { formatUsd } from "@/lib/format";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/cn";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "Whale-leaderboard",
  description: "De gevolgde whale- en smart-money-wallets op Ethereum en Solana, gesorteerd op volume, trades en activiteit.",
  alternates: { canonical: "/wallets" },
};

const SORTS: { key: WalletSort; label: string }[] = [
  { key: "volume", label: "Volume 30d" },
  { key: "trades", label: "Transacties 30d" },
  { key: "recent", label: "Laatst actief" },
];

export default async function WalletsPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort: s } = await searchParams;
  const sort: WalletSort = s === "trades" || s === "recent" ? s : "volume";
  const wallets = await getLeaderboard(sort, 200);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6">
      <h1 className="display text-[48px] sm:text-[64px]">Wallets</h1>
      <p className="mt-3 max-w-[62ch] text-[15px] text-ink-2">
        De wallets die we volgen, met hun activiteit van de laatste 30 dagen. We tonen geen winst of verlies: zonder de volledige
        aankoophistorie van elke positie is die niet betrouwbaar te berekenen.
      </p>

      <div className="mt-10 overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface">
        <div className="grid grid-cols-[28px_1fr_auto] items-center gap-4 border-b border-line px-4 py-2.5 text-[12px] text-ink-3 sm:grid-cols-[28px_1fr_60px_140px_110px_120px] sm:px-5">
          <span>#</span>
          <span>Wallet</span>
          <span className="hidden sm:block">Chain</span>
          {SORTS.map((o) => (
            <Link
              key={o.key}
              href={`/wallets?sort=${o.key}`}
              scroll={false}
              aria-current={sort === o.key ? "true" : undefined}
              className={cn(
                "inline-flex items-center justify-end gap-1 transition-colors hover:text-ink",
                sort === o.key ? "text-amber" : "",
                o.key !== "volume" && "hidden sm:inline-flex",
              )}
            >
              {o.label}
              {sort === o.key && <ArrowDown className="size-3" />}
            </Link>
          ))}
        </div>
        {wallets.length ? (
          wallets.map((w, i) => (
            <Link
              key={w.id}
              href={`/wallet/${w.chain}/${w.address}`}
              className="grid grid-cols-[28px_1fr_auto] items-center gap-4 border-b border-line px-4 py-3.5 transition-colors last:border-b-0 hover:bg-surface-2 sm:grid-cols-[28px_1fr_60px_140px_110px_120px] sm:px-5"
            >
              <span className="num text-sm text-ink-3">{i + 1}</span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium">{w.label}</span>
                <WalletTypeTag type={w.type} />
              </span>
              <span className="hidden sm:block"><ChainTag chain={w.chain} /></span>
              <span className="num text-right font-medium">{formatUsd(w.volume_30d)}</span>
              <span className="num hidden text-right text-ink-2 sm:block">{w.trades_30d}</span>
              <span className="hidden text-right text-[13px] text-ink-3 sm:block">{w.last_activity ? timeAgo(w.last_activity) : "—"}</span>
            </Link>
          ))
        ) : (
          <div className="px-5">
            <Empty title="Nog geen wallets.">Zodra er wallets gevolgd worden, staan ze hier met hun activiteit.</Empty>
          </div>
        )}
      </div>
    </div>
  );
}
