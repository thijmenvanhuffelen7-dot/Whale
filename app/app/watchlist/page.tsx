import Link from "next/link";
import { Trash2 } from "lucide-react";
import { requireProfile, planOf } from "@/lib/auth";
import { getWatchlist } from "@/lib/user-data";
import { removeWatch, updateWatchThreshold } from "@/lib/actions";
import { Panel, Empty, inputClass } from "@/components/ui/panel";
import { ChainTag } from "@/components/ui/tags";
import { WatchForm } from "@/components/app/watch-form";
import { shortAddress } from "@/lib/messages";

export default async function WatchlistPage({ searchParams }: { searchParams: Promise<{ added?: string; error?: string }> }) {
  const p = await requireProfile("/app/watchlist");
  const list = await getWatchlist(p.id);
  const plan = planOf(p);
  const sp = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="display text-[40px] sm:text-[48px]">Watchlist</h1>
        <p className="mt-2 text-sm text-ink-2">
          {list.length} of {p.plan === "pro" ? "unlimited" : plan.maxWatchlist}. You get an alert when an item moves above your threshold
          {plan.dmAlerts ? ", by Telegram DM." : ". DM alerts are part of Pro."}
        </p>
        {sp.added && <p role="status" className="mt-2 text-sm text-buy">Added to your watchlist.</p>}
        {sp.error && <p role="alert" className="mt-2 text-sm text-sell">{sp.error}</p>}
      </div>

      <Panel title="Add">
        <WatchForm />
      </Panel>

      <Panel title="Following" bodyClassName="p-0 sm:p-0">
        {list.length ? (
          <ul>
            {list.map((w) => (
              <li key={w.id} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line px-5 py-3.5 last:border-b-0 md:grid-cols-[80px_1fr_220px_40px]">
                <span className="hidden items-center gap-2 md:flex">
                  <ChainTag chain={w.chain} />
                  <span className="text-[12px] text-ink-3">{w.kind === "wallet" ? "Wallet" : "Token"}</span>
                </span>
                <Link href={`/${w.kind}/${w.chain}/${w.address}`} className="min-w-0 hover:text-amber">
                  <span className="block truncate font-medium">{w.label ?? shortAddress(w.address)}</span>
                  <span className="num block truncate text-[12px] text-ink-3">{shortAddress(w.address, 6, 6)}</span>
                </Link>
                <form action={updateWatchThreshold} className="col-span-2 flex items-center gap-2 md:col-span-1">
                  <input type="hidden" name="id" value={w.id} />
                  <label className="text-[12px] text-ink-3" htmlFor={`t-${w.id}`}>From $</label>
                  <input id={`t-${w.id}`} name="min_usd" defaultValue={w.min_usd} inputMode="numeric" className={inputClass + " num h-9 w-28"} />
                  <button className="h-9 rounded-[var(--radius-ctl)] px-2 text-[13px] text-ink-2 hover:bg-surface-2 hover:text-ink">Save</button>
                </form>
                <form action={removeWatch} className="row-start-1 col-start-2 justify-self-end md:row-auto md:col-auto">
                  <input type="hidden" name="id" value={w.id} />
                  <button aria-label={`Remove ${w.label ?? w.address}`} className="rounded p-2 text-ink-3 hover:bg-surface-2 hover:text-sell">
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-5">
            <Empty title="Nothing in your watchlist yet.">Paste an address above, or click &ldquo;Follow this wallet&rdquo; on a wallet page.</Empty>
          </div>
        )}
      </Panel>
    </div>
  );
}
