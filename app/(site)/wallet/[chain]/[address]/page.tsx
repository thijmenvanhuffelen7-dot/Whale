import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { exchangeFlowsByDay, getFeed, getWallet, topTokens } from "@/lib/data";
import { getHoldings } from "@/lib/holdings";
import { getProfile } from "@/lib/auth";
import { isEthAddress, isSolAddress, normAddr, type Chain } from "@/lib/chain/types";
import { Panel, Empty } from "@/components/ui/panel";
import { Address } from "@/components/ui/address";
import { ChainTag, WalletTypeTag } from "@/components/ui/tags";
import { AlertRow } from "@/components/site/alert-row";
import { FollowButton } from "@/components/site/follow-button";
import { FlowChart } from "@/components/charts/charts";
import { compact, formatUsd } from "@/lib/format";
import { shortAddress } from "@/lib/messages";
import { timeAgo } from "@/lib/time";

export const revalidate = 120;

type Params = { chain: string; address: string };

function parse(p: Params): { chain: Chain; address: string } | null {
  if (p.chain === "eth" && isEthAddress(p.address)) return { chain: "eth", address: normAddr("eth", p.address) };
  if (p.chain === "sol" && isSolAddress(p.address)) return { chain: "sol", address: p.address };
  return null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = parse(await params);
  if (!p) return {};
  const w = await getWallet(p.chain, p.address);
  const name = w?.label ?? shortAddress(p.address);
  return {
    title: `${name}: wallet op ${p.chain === "eth" ? "Ethereum" : "Solana"}`,
    description: `Transacties, holdings en exchange-flows van ${name}${w ? `, ${formatUsd(w.volume_30d)} volume in 30 dagen` : ""}.`,
    alternates: { canonical: `/wallet/${p.chain}/${p.address}` },
  };
}

export default async function WalletPage({ params }: { params: Promise<Params> }) {
  const p = parse(await params);
  if (!p) notFound();
  const profile = await getProfile().catch(() => null);
  const [wallet, events, holdings] = await Promise.all([
    getWallet(p.chain, p.address),
    getFeed({ wallet: p.address, limit: 200 }, profile?.plan === "pro"),
    getHoldings(p.chain, p.address),
  ]);
  if (!wallet && !events.length) notFound();

  const flows = exchangeFlowsByDay(events);
  const hasFlows = flows.some((f) => f.in || f.out);
  const tops = topTokens(events.filter((e) => e.type === "swap_buy" || e.type === "swap_sell"));
  const explorer = p.chain === "eth" ? `https://etherscan.io/address/${p.address}` : `https://solscan.io/account/${p.address}`;
  const back = `/wallet/${p.chain}/${p.address}`;

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-3">
            <ChainTag chain={p.chain} />
            <WalletTypeTag type={wallet?.type ?? null} />
          </div>
          <h1 className="display break-words text-[44px] sm:text-[60px]">{wallet?.label ?? shortAddress(p.address)}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <Address value={p.address} full className="max-w-full" />
            <a href={explorer} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
              {p.chain === "eth" ? "Etherscan" : "Solscan"} <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
        <FollowButton kind="wallet" chain={p.chain} address={p.address} label={wallet?.label} back={back} />
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line sm:grid-cols-4">
        {[
          ["Volume 30d", formatUsd(wallet?.volume_30d ?? 0)],
          ["Transacties 30d", String(wallet?.trades_30d ?? events.length)],
          ["Swaps 30d", String(wallet?.swaps_30d ?? 0)],
          ["Laatst actief", wallet?.last_activity ? timeAgo(wallet.last_activity) : events[0] ? timeAgo(events[0].created_at) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="bg-surface px-5 py-4">
            <dt className="text-[12px] text-ink-3">{k}</dt>
            <dd className="num mt-1 text-[22px] font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Exchange-flows, 30 dagen" action={<span className="flex gap-3 text-[12px] text-ink-3"><span className="text-buy">● van exchange</span><span className="text-sell">● naar exchange</span></span>}>
          {hasFlows ? (
            <FlowChart data={flows} inKey="in" outKey="out" inLabel="Van exchange" outLabel="Naar exchange" />
          ) : (
            <Empty title="Geen exchange-flows in deze periode." />
          )}
        </Panel>

        <Panel title="Meest verhandeld" bodyClassName="p-0 sm:p-0">
          {tops.length ? (
            <ul>
              {tops.map((t) => (
                <li key={t.address} className="border-b border-line last:border-b-0">
                  <Link href={`/token/${t.chain}/${t.address}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-surface-2">
                    <span className="font-medium">${t.symbol}</span>
                    <span className="num text-sm text-ink-2">{t.count}× · {formatUsd(t.usd)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5"><Empty title="Nog geen swaps gezien." /></div>
          )}
        </Panel>
      </div>

      {holdings && (
        <Panel title="Holdings nu" className="mt-6" bodyClassName="p-0 sm:p-0">
          {holdings.length ? (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3">
              {holdings.map((h) => (
                <li key={h.address} className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 sm:border-r">
                  <Link href={`/token/${p.chain}/${h.address}`} className="font-medium hover:text-amber">${h.symbol}</Link>
                  <span className="num text-right text-sm">
                    <span className="text-ink-2">{compact(h.amount)}</span> <span className="text-ink">{formatUsd(h.usd)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5"><Empty title="Geen tokens gevonden." /></div>
          )}
        </Panel>
      )}

      <Panel title="Tijdlijn" className="mt-6" bodyClassName="p-0 sm:p-0">
        {events.length ? (
          <div className="divide-y divide-line">{events.slice(0, 60).map((e) => <AlertRow key={e.id} e={e} />)}</div>
        ) : (
          <div className="px-5"><Empty title="Nog geen gemelde transacties." /></div>
        )}
      </Panel>
    </div>
  );
}
