import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFeed, tokenFlowsByDay } from "@/lib/data";
import { getTokenInfo } from "@/lib/prices";
import { getHourlyCandles } from "@/lib/prices/ohlc";
import { cachedTokenAnalysis } from "@/lib/analyse/run";
import { getProfile } from "@/lib/auth";
import { isEthAddress, isSolAddress, normAddr, type Chain } from "@/lib/chain/types";
import { Panel, Empty } from "@/components/ui/panel";
import { Address } from "@/components/ui/address";
import { ChainTag } from "@/components/ui/tags";
import { AlertRow } from "@/components/site/alert-row";
import { FollowButton } from "@/components/site/follow-button";
import { FlowChart, PriceChart } from "@/components/charts/charts";
import { formatPct, formatPrice, formatUsd } from "@/lib/format";
import { DISCLAIMER } from "@/lib/messages";
import { dexscreenerUrl } from "@/lib/alerts/format";
import { cn } from "@/lib/cn";

export const revalidate = 300;

type Params = { chain: string; address: string };

function parse(p: Params): { chain: Chain; address: string } | null {
  if (p.chain === "eth" && isEthAddress(p.address)) return { chain: "eth", address: normAddr("eth", p.address) };
  if (p.chain === "sol" && isSolAddress(p.address)) return { chain: "sol", address: p.address };
  return null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = parse(await params);
  if (!p) return {};
  const t = await getTokenInfo(p.chain, p.address);
  if (!t) return {};
  return {
    title: `$${t.symbol}: whale-activiteit en prijs`,
    description: `Prijs, liquiditeit en welke gevolgde whales ${t.name ?? t.symbol} kopen of verkopen op ${p.chain === "eth" ? "Ethereum" : "Solana"}.`,
    alternates: { canonical: `/token/${p.chain}/${p.address}` },
  };
}

export default async function TokenPage({ params }: { params: Promise<Params> }) {
  const p = parse(await params);
  if (!p) notFound();
  const token = await getTokenInfo(p.chain, p.address);
  if (!token) notFound();
  const profile = await getProfile().catch(() => null);

  const [candles, events, analysis] = await Promise.all([
    token.pairAddress ? getHourlyCandles(p.chain, token.pairAddress) : Promise.resolve([]),
    getFeed({ chain: p.chain, token: p.address, limit: 200 }, profile?.plan === "pro"),
    cachedTokenAnalysis(p.chain, p.address).catch(() => null),
  ]);

  const flows = tokenFlowsByDay(events);
  const holders = new Map<string, { label: string; address: string; buys: number; sells: number; usd: number }>();
  for (const e of events) {
    if (!e.wallet_address) continue;
    const h = holders.get(e.wallet_address) ?? { label: e.wallet_label ?? e.wallet_address.slice(0, 6), address: e.wallet_address, buys: 0, sells: 0, usd: 0 };
    if (e.type === "swap_buy") h.buys++;
    if (e.type === "swap_sell") h.sells++;
    h.usd += e.usd_value ?? 0;
    holders.set(e.wallet_address, h);
  }
  const wallets = [...holders.values()].sort((a, b) => b.usd - a.usd).slice(0, 10);
  const change = token.priceChange24hPct;

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="mb-3"><ChainTag chain={p.chain} /></div>
          <h1 className="display text-[48px] sm:text-[64px]">
            ${token.symbol}
            {token.name && <span className="ml-4 align-middle font-sans text-[18px] font-normal tracking-normal text-ink-2" style={{ fontStretch: "100%" }}>{token.name}</span>}
          </h1>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <span className="num text-[28px] font-medium">{formatPrice(token.priceUsd)}</span>
            <span className={cn("num text-[15px]", change == null ? "text-ink-3" : change >= 0 ? "text-buy" : "text-sell")}>{formatPct(change)} 24u</span>
            <Address value={token.address} className="text-sm" />
          </div>
        </div>
        <FollowButton kind="token" chain={p.chain} address={p.address} label={token.symbol} back={`/token/${p.chain}/${p.address}`} />
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line sm:grid-cols-4">
        {[
          ["Volume 24u", formatUsd(token.volume24hUsd)],
          ["Liquiditeit", Number.isFinite(token.liquidityUsd) ? formatUsd(token.liquidityUsd) : "—"],
          ["Market cap", formatUsd(token.marketCapUsd ?? token.fdvUsd)],
          ["Gevolgde wallets", String(wallets.length)],
        ].map(([k, v]) => (
          <div key={k} className="bg-surface px-5 py-4">
            <dt className="text-[12px] text-ink-3">{k}</dt>
            <dd className="num mt-1 text-[22px] font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Prijs, 7 dagen" action={<a href={token.pairUrl ?? dexscreenerUrl(p.chain, p.address)} target="_blank" rel="noopener noreferrer" className="text-[12px] text-ink-2 hover:text-ink">DexScreener</a>}>
          {candles.length > 1 ? <PriceChart data={candles} /> : <Empty title="Geen prijsgeschiedenis beschikbaar." />}
        </Panel>
        <Panel title="Samenvatting">
          {analysis?.summary ? (
            <div className="flex flex-col gap-4">
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{analysis.summary}</p>
              <p className="text-[12px] text-ink-3">Max. 1x per uur ververst. {DISCLAIMER}</p>
            </div>
          ) : (
            <Empty title="Nog geen samenvatting.">Er is nog niet genoeg data, of de AI-samenvatting staat uit. {DISCLAIMER}</Empty>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Whale-instroom vs. -uitstroom, 14 dagen" action={<span className="flex gap-3 text-[12px]"><span className="text-buy">● in</span><span className="text-sell">● uit</span></span>}>
          {flows.some((f) => f.buy || f.sell) ? (
            <FlowChart data={flows} inKey="buy" outKey="sell" inLabel="Instroom" outLabel="Uitstroom" />
          ) : (
            <Empty title="Geen whale-activiteit in deze periode." />
          )}
        </Panel>
        <Panel title="Gevolgde wallets in dit token" bodyClassName="p-0 sm:p-0">
          {wallets.length ? (
            <ul>
              {wallets.map((w) => (
                <li key={w.address} className="border-b border-line last:border-b-0">
                  <Link href={`/wallet/${p.chain}/${w.address}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-surface-2">
                    <span className="truncate font-medium">{w.label}</span>
                    <span className="num shrink-0 text-[13px]">
                      <span className="text-buy">{w.buys} in</span> · <span className="text-sell">{w.sells} uit</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5"><Empty title="Geen gevolgde wallet heeft dit token verhandeld." /></div>
          )}
        </Panel>
      </div>

      <Panel title="Laatste meldingen" className="mt-6" bodyClassName="p-0 sm:p-0">
        {events.length ? <div className="divide-y divide-line">{events.slice(0, 30).map((e) => <AlertRow key={e.id} e={e} />)}</div> : <div className="px-5"><Empty title="Nog geen meldingen voor dit token." /></div>}
      </Panel>
    </div>
  );
}
