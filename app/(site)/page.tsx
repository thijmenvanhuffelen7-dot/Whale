import Link from "next/link";
import { ArrowRight, Bell, Building2, LineChart, MessageCircle, Radar, ScanSearch } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { LiveFeed } from "@/components/site/live-feed";
import { PricingTable } from "@/components/site/pricing-table";
import { Faq, FAQ } from "@/components/site/faq";
import { StatsStrip } from "@/components/site/stats-strip";
import { DepthContours } from "@/components/site/depth-contours";
import { ChainTag, WalletTypeTag } from "@/components/ui/tags";
import { getFeed, getLeaderboard, getStats } from "@/lib/data";
import { getProfile } from "@/lib/auth";
import { formatUsd } from "@/lib/format";
import { timeAgo } from "@/lib/time";
import { SITE } from "@/lib/site";

export const revalidate = 60;

const FEATURES = [
  { Icon: Radar, title: "Whale transfers", text: "Large moves by tracked wallets and tokens, above a threshold you choose." },
  { Icon: LineChart, title: "Smart money buys and sells", text: "A tracked trader swaps? You see which token, how much, and what they paid with." },
  { Icon: Building2, title: "Exchange flows", text: "Deposits to and withdrawals from Binance, Coinbase, Kraken, OKX and Bybit, marked separately." },
  { Icon: ScanSearch, title: "Coin analysis", text: "Price, volume, liquidity, recent whale activity and news in one view. Even from a screenshot." },
  { Icon: MessageCircle, title: "In Telegram", text: "Alerts in the group, or as a Pro member in your own DMs with your own thresholds." },
];

export default async function Home() {
  const [feed, stats, leaders, profile] = await Promise.all([
    getFeed({ limit: 5 }),
    getStats(),
    getLeaderboard("volume", 5),
    getProfile().catch(() => null),
  ]);

  return (
    <>
      {/* HERO: de live feed is de blikvanger */}
      <section className="relative overflow-hidden border-b border-line">
        <DepthContours className="absolute inset-0 h-full w-full [mask-image:linear-gradient(to_bottom,black_55%,transparent)]" />
        <div className="relative mx-auto grid max-w-[1240px] gap-12 px-4 pt-16 pb-16 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16 lg:pt-24 lg:pb-24">
          <div className="max-w-[560px]">
            <h1 className="display text-[56px] sm:text-[76px] lg:text-[88px]">
              See what whales do, <span className="text-amber">the moment they do it.</span>
            </h1>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-ink-2">
              Large transfers, smart-money swaps and exchange flows on Ethereum and Solana. Posted in Telegram and live on the web.
              Facts only, no advice.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/login?mode=signup" size="lg">
                Start free <ArrowRight className="size-4" />
              </ButtonLink>
              {SITE.telegramPublic ? (
                <ButtonLink href={SITE.telegramPublic} variant="ghost" size="lg" external>
                  Open the Telegram channel
                </ButtonLink>
              ) : (
                <ButtonLink href="/feed" variant="ghost" size="lg">View the live feed</ButtonLink>
              )}
            </div>
          </div>

          <div className="rounded-[var(--radius-panel)] border border-line bg-surface/90 shadow-[var(--shadow-overlay)] backdrop-blur-sm">
            <div className="flex h-12 items-center justify-between border-b border-line px-4 sm:px-5">
              <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
                <span className="live-pulse size-1.5 rounded-full bg-amber" /> Live
              </span>
              <span className="text-[12px] text-ink-3">{profile?.plan === "pro" ? "Real-time" : "Delayed 15 min"}</span>
            </div>
            <LiveFeed
              initial={feed}
              limit={5}
              pollMs={20_000}
              compactMode
              empty={
                <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
                  <span className="relative flex size-3">
                    <span className="absolute inset-0 animate-ping rounded-full bg-amber/40 motion-reduce:animate-none" />
                    <span className="relative size-3 rounded-full bg-amber" />
                  </span>
                  <p className="text-[15px] font-medium">Sonar is on.</p>
                  <p className="max-w-[36ch] text-sm text-ink-2">As soon as a tracked wallet moves, it shows up here.</p>
                </div>
              }
            />
            <Link href="/feed" className="flex h-11 items-center justify-center gap-1.5 border-t border-line text-[13px] text-ink-2 transition-colors hover:text-amber">
              Full feed with filters <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <StatsStrip stats={stats} />

      {/* FEATURES: een lijst, geen kaarten-grid */}
      <section className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="display max-w-[12ch] text-[44px] sm:text-[56px]">Everything that moves on the water.</h2>
          <ul className="divide-y divide-line border-y border-line">
            {FEATURES.map((f) => (
              <li key={f.title} className="grid grid-cols-[28px_1fr] gap-4 py-6 sm:grid-cols-[28px_220px_1fr] sm:gap-6">
                <f.Icon className="mt-0.5 size-5 text-amber" strokeWidth={1.75} aria-hidden />
                <h3 className="text-[16px] font-medium">{f.title}</h3>
                <p className="col-start-2 text-[15px] leading-relaxed text-ink-2 sm:col-start-3">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ZO WERKT HET: de volgorde is hier informatie */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6">
          <h2 className="display text-[44px] sm:text-[56px]">How it works</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              ["We read the chain", "Through Helius and Alchemy we see every transaction of the wallets we track, on Ethereum and Solana, around the clock."],
              ["We filter the noise", "Dust, spam tokens and internal shuffles are dropped. What remains is big enough to report."],
              ["You get the alert", "In the Telegram group, on the web, or as Pro in your DMs. With links to the explorer and DexScreener."],
            ].map(([t, d], i) => (
              <li key={t} className="flex flex-col gap-3 border-t border-line-strong pt-5">
                <span className="num text-[13px] text-amber">Step {i + 1}</span>
                <h3 className="text-[19px] font-medium">{t}</h3>
                <p className="text-[15px] leading-relaxed text-ink-2">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* LEADERBOARD-PREVIEW */}
      <section className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="display text-[44px] sm:text-[56px]">Most active, 30 days</h2>
          <ButtonLink href="/wallets" variant="ghost">All wallets <ArrowRight className="size-4" /></ButtonLink>
        </div>
        {leaders.length ? (
          <div className="overflow-hidden rounded-[var(--radius-panel)] border border-line">
            {leaders.map((w, i) => (
              <Link
                key={w.id}
                href={`/wallet/${w.chain}/${w.address}`}
                className="grid grid-cols-[28px_1fr_auto] items-center gap-4 border-b border-line bg-surface px-4 py-4 transition-colors last:border-b-0 hover:bg-surface-2 sm:grid-cols-[28px_1fr_120px_140px_120px] sm:px-5"
              >
                <span className="num text-sm text-ink-3">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{w.label}</span>
                  <WalletTypeTag type={w.type} />
                </span>
                <span className="hidden sm:block"><ChainTag chain={w.chain} /></span>
                <span className="num text-right font-medium">{formatUsd(w.volume_30d)}</span>
                <span className="hidden text-right text-[13px] text-ink-3 sm:block">
                  {w.last_activity ? timeAgo(w.last_activity) : "no activity"}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-[var(--radius-panel)] border border-line bg-surface px-5 py-8 text-ink-2">
            The leaderboard fills up with the first tracked transactions.
          </p>
        )}
      </section>

      {/* PRIJZEN */}
      <section id="pricing" className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1040px] px-4 py-24 sm:px-6">
          <h2 className="display mb-10 text-[44px] sm:text-[56px]">Pricing</h2>
          <PricingTable loggedIn={Boolean(profile)} currentPlan={profile?.plan} />
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[880px] px-4 py-24 sm:px-6">
        <h2 className="display mb-10 text-[44px] sm:text-[56px]">Questions</h2>
        <Faq />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            }),
          }}
        />
      </section>

      {/* Testimonials: bewust leeg tot er echte zijn. Geen nep-reviews. */}

      {/* CTA */}
      <section className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-col items-start gap-8 px-4 py-24 sm:px-6 md:flex-row md:items-end md:justify-between">
          <h2 className="display max-w-[14ch] text-[48px] sm:text-[64px]">
            Don’t miss the next <span className="text-amber">big move</span>.
          </h2>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/login?mode=signup" size="lg"><Bell className="size-4" /> Create a free account</ButtonLink>
            {SITE.telegramPublic && (
              <ButtonLink href={SITE.telegramPublic} variant="ghost" size="lg" external>Telegram</ButtonLink>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
