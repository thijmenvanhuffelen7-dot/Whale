import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ChainTag, TypeBadge, toneClass } from "@/components/ui/tags";
import { compact, formatUsd } from "@/lib/format";
import { shortAddress } from "@/lib/messages";
import { clock, timeAgo, timeShort } from "@/lib/time";
import { explorerTxUrl } from "@/lib/alerts/format";
import type { FeedEvent } from "@/lib/data";
import { cn } from "@/lib/cn";

/** Eén regel in de feed. `fresh` = net binnen: de status-dot zendt een sonar-ping uit. */
export function AlertRow({ e, fresh = false, compactMode = false }: { e: FeedEvent; fresh?: boolean; compactMode?: boolean }) {
  const who = e.wallet_label ?? (e.wallet_address ? shortAddress(e.wallet_address) : "Onbekend");
  const sym = e.token_symbol ?? "TOKEN";
  return (
    <div
      className={cn(
        "group grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 sm:px-5",
        !compactMode && "md:grid-cols-[64px_44px_132px_minmax(0,1fr)_minmax(0,1fr)_120px_24px]",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="relative flex size-2">
          {fresh && <span className={cn("ping-ring absolute inset-0 rounded-full", toneClass(e.type).replace("text-", "bg-"))} />}
          <span className={cn("relative size-2 rounded-full", toneClass(e.type).replace("text-", "bg-"))} />
        </span>
        <time className="num whitespace-nowrap text-[12px] text-ink-3" dateTime={e.created_at} title={`${timeAgo(e.created_at)} · ${clock(e.created_at)}`} suppressHydrationWarning>
          {timeShort(e.created_at)}
        </time>
      </div>

      {!compactMode && (
        <div className="hidden md:block">
          <ChainTag chain={e.chain} />
        </div>
      )}
      <div className={cn("justify-self-start", !compactMode && "md:col-auto")}>
        <TypeBadge type={e.type} />
      </div>

      <div className={cn("col-span-3 min-w-0", !compactMode && "md:col-span-1")}>
        {e.wallet_address ? (
          <Link
            href={`/wallet/${e.chain}/${e.wallet_address}`}
            className="block truncate text-[14px] font-medium text-ink hover:text-amber"
          >
            {who}
          </Link>
        ) : (
          <span className="block truncate text-[14px] text-ink">{who}</span>
        )}
      </div>

      <div className={cn("col-span-2 min-w-0 text-[14px]", !compactMode && "md:col-span-1")}>
        <span className="num text-ink">{compact(e.amount)}</span>{" "}
        {e.token_address ? (
          <Link href={`/token/${e.chain}/${e.token_address}`} className="font-medium text-ink hover:text-amber">
            ${sym}
          </Link>
        ) : (
          <span className="font-medium">${sym}</span>
        )}
        {e.quote_token_symbol && e.quote_amount ? (
          <span className="text-ink-3">
            {" "}
            · <span className="num">{compact(e.quote_amount)}</span> {e.quote_token_symbol}
          </span>
        ) : null}
        {compactMode && <span className="ml-2 align-middle"><ChainTag chain={e.chain} /></span>}
      </div>

      <div className="num justify-self-end text-[14px] font-medium text-ink">{formatUsd(e.usd_value)}</div>

      {!compactMode && (
        <a
          href={explorerTxUrl(e.chain, e.tx_hash)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Bekijk transactie"
          className="hidden justify-self-end text-ink-3 transition-colors hover:text-ink md:block"
        >
          <ExternalLink className="size-4" />
        </a>
      )}
    </div>
  );
}
