import type { Metadata } from "next";
import { Suspense } from "react";
import { LiveFeed } from "@/components/site/live-feed";
import { FeedFilters } from "@/components/site/feed-filters";
import { Empty } from "@/components/ui/panel";
import { ButtonLink } from "@/components/ui/button";
import { getFeed } from "@/lib/data";
import { feedQueryString, parseFeedParams } from "@/lib/feed-params";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Live feed",
  description: "Every whale transfer, smart-money swap and exchange flow on Ethereum and Solana, live and filterable.",
  alternates: { canonical: "/feed" },
};

export default async function FeedPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filter = parseFeedParams(await searchParams);
  const profile = await getProfile().catch(() => null);
  const realtime = profile?.plan === "pro";
  const events = await getFeed(filter, realtime);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="display text-[48px] sm:text-[64px]">Live feed</h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-2">
            <span className="live-pulse size-1.5 rounded-full bg-amber" />
            {realtime ? "Real-time, refreshes every 5 seconds." : "Delayed 15 minutes. Pro sees everything instantly."}
          </p>
        </div>
        {!realtime && <ButtonLink href="/pricing" variant="ghost" size="sm">Real-time with Pro</ButtonLink>}
      </div>

      <Suspense>
        <FeedFilters />
      </Suspense>

      <div className="mt-6 overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface">
        <div className="hidden grid-cols-[64px_44px_132px_minmax(0,1fr)_minmax(0,1fr)_120px_24px] gap-x-3 border-b border-line px-5 py-2.5 text-[12px] text-ink-3 md:grid">
          <span>Time</span><span>Chain</span><span>Type</span><span>Wallet</span><span>Amount</span><span className="text-right">USD</span><span />
        </div>
        <LiveFeed
          key={feedQueryString(filter)}
          initial={events}
          query={feedQueryString(filter)}
          pollMs={realtime ? 5_000 : 30_000}
          limit={50}
          empty={
            <div className="px-5">
              <Empty title="Nothing found with these filters.">
                Remove a filter or lower the minimum amount. New alerts show up here automatically.
              </Empty>
            </div>
          }
        />
      </div>
    </div>
  );
}
