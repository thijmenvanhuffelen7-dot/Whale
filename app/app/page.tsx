import Link from "next/link";
import { ArrowRight, Send } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getFeed, topTokens } from "@/lib/data";
import { getMyAlerts, getWatchlist } from "@/lib/user-data";
import { Panel, Empty } from "@/components/ui/panel";
import { ButtonLink } from "@/components/ui/button";
import { AlertRow } from "@/components/site/alert-row";
import { ChainTag } from "@/components/ui/tags";
import { formatUsd } from "@/lib/format";
import { shortAddress } from "@/lib/messages";

export default async function Dashboard() {
  const p = await requireProfile();
  const list = await getWatchlist(p.id);
  const [mine, pulse] = await Promise.all([getMyAlerts(p, list, 20), getFeed({ limit: 200 }, p.plan === "pro")]);
  const since = Date.now() - 86400_000;
  const day = pulse.filter((e) => new Date(e.created_at).getTime() > since);
  const biggest = [...day].sort((a, b) => (b.usd_value ?? 0) - (a.usd_value ?? 0)).slice(0, 6);
  const hotTokens = topTokens(day, 5);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="display text-[40px] sm:text-[48px]">Dashboard</h1>

      {!p.telegram_user_id && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-panel)] border border-amber/40 bg-amber-dim/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px]">
            <span className="font-medium text-ink">Link Telegram</span>
            <span className="text-ink-2"> to get watchlist alerts in your DMs{p.plan === "pro" ? " and access to the Pro group." : "."}</span>
          </p>
          <ButtonLink href="/app/account#telegram" size="sm"><Send className="size-4" /> Link</ButtonLink>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="My alerts" action={<Link href="/app/watchlist" className="text-[13px] text-ink-2 hover:text-ink">Watchlist ({list.length})</Link>} bodyClassName="p-0 sm:p-0">
          {mine.length ? (
            <div className="divide-y divide-line">{mine.map((e) => <AlertRow key={e.id} e={e} compactMode />)}</div>
          ) : (
            <div className="px-5">
              <Empty
                title={list.length ? "No activity from your watchlist yet." : "You're not following anything yet."}
                action={!list.length && <ButtonLink href="/wallets" size="sm">Pick wallets to follow <ArrowRight className="size-4" /></ButtonLink>}
              >
                {list.length ? "As soon as a wallet or token from your watchlist moves, you'll see it here." : "Add wallets or tokens to your watchlist and get only the alerts you want."}
              </Empty>
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Market pulse: biggest moves, 24h" bodyClassName="p-0 sm:p-0">
            {biggest.length ? (
              <ul>
                {biggest.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 last:border-b-0">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{e.wallet_label ?? shortAddress(e.wallet_address ?? "")}</span>
                      <span className="text-[12px] text-ink-3">{e.token_symbol ? `$${e.token_symbol}` : ""}</span>
                    </span>
                    <span className="num shrink-0 text-sm font-medium">{formatUsd(e.usd_value)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5"><Empty title="Calm waters." /></div>
            )}
          </Panel>
          <Panel title="Most whale volume per token, 24h" bodyClassName="p-0 sm:p-0">
            {hotTokens.length ? (
              <ul>
                {hotTokens.map((t) => (
                  <li key={t.address} className="border-b border-line last:border-b-0">
                    <Link href={`/token/${t.chain}/${t.address}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-surface-2">
                      <span className="flex items-center gap-2 font-medium">${t.symbol} <ChainTag chain={t.chain} /></span>
                      <span className="num text-sm text-ink-2">{formatUsd(t.usd)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5"><Empty title="No data yet." /></div>
            )}
          </Panel>
        </div>
      </div>
      {p.plan !== "pro" && <p className="text-[13px] text-ink-3">You see everything with a 15-minute delay. <Link href="/pricing" className="text-amber underline">Pro is real-time.</Link></p>}
    </div>
  );
}
