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
  { Icon: Radar, title: "Whale-transfers", text: "Grote bewegingen van gevolgde wallets en tokens, boven een drempel die je zelf kiest." },
  { Icon: LineChart, title: "Smart money kopen en verkopen", text: "Een gevolgde trader swapt? Je ziet welk token, hoeveel, en waarmee betaald." },
  { Icon: Building2, title: "Exchange-flows", text: "Stortingen naar en opnames van Binance, Coinbase, Kraken, OKX en Bybit, apart gemarkeerd." },
  { Icon: ScanSearch, title: "Analyse per coin", text: "Prijs, volume, liquiditeit, recente whale-activiteit en nieuws in één overzicht. Ook vanaf een screenshot." },
  { Icon: MessageCircle, title: "In Telegram", text: "Alerts in de groep, of als Pro-lid in je eigen DM met je eigen drempels." },
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
              Zie wat whales doen, <span className="text-amber">zodra ze het doen.</span>
            </h1>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-ink-2">
              Grote transfers, smart-money-swaps en exchange-flows op Ethereum en Solana. Gemeld in Telegram en live op het web.
              Alleen feiten, geen advies.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/login?mode=signup" size="lg">
                Start gratis <ArrowRight className="size-4" />
              </ButtonLink>
              {SITE.telegramPublic ? (
                <ButtonLink href={SITE.telegramPublic} variant="ghost" size="lg" external>
                  Open het Telegram-kanaal
                </ButtonLink>
              ) : (
                <ButtonLink href="/feed" variant="ghost" size="lg">Bekijk de live feed</ButtonLink>
              )}
            </div>
          </div>

          <div className="rounded-[var(--radius-panel)] border border-line bg-surface/90 shadow-[var(--shadow-overlay)] backdrop-blur-sm">
            <div className="flex h-12 items-center justify-between border-b border-line px-4 sm:px-5">
              <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
                <span className="live-pulse size-1.5 rounded-full bg-amber" /> Live
              </span>
              <span className="text-[12px] text-ink-3">{profile?.plan === "pro" ? "Realtime" : "15 min vertraagd"}</span>
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
                  <p className="text-[15px] font-medium">Sonar staat aan.</p>
                  <p className="max-w-[36ch] text-sm text-ink-2">Zodra een gevolgde wallet beweegt, verschijnt het hier.</p>
                </div>
              }
            />
            <Link href="/feed" className="flex h-11 items-center justify-center gap-1.5 border-t border-line text-[13px] text-ink-2 transition-colors hover:text-amber">
              Hele feed met filters <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <StatsStrip stats={stats} />

      {/* FEATURES: een lijst, geen kaarten-grid */}
      <section className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="display max-w-[12ch] text-[44px] sm:text-[56px]">Alles wat je op het water ziet bewegen.</h2>
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
          <h2 className="display text-[44px] sm:text-[56px]">Zo werkt het</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              ["Wij lezen de chain", "Via Helius en Alchemy zien we elke transactie van de wallets die we volgen, op Ethereum en Solana, de hele dag."],
              ["Wij filteren de ruis", "Dust, spam-tokens en interne schuifjes vallen weg. Wat overblijft is groot genoeg om te melden."],
              ["Jij krijgt de melding", "In de Telegram-groep, op het web, of als Pro in je DM. Met links naar explorer en DexScreener."],
            ].map(([t, d], i) => (
              <li key={t} className="flex flex-col gap-3 border-t border-line-strong pt-5">
                <span className="num text-[13px] text-amber">Stap {i + 1}</span>
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
          <h2 className="display text-[44px] sm:text-[56px]">Meest actief, 30 dagen</h2>
          <ButtonLink href="/wallets" variant="ghost">Alle wallets <ArrowRight className="size-4" /></ButtonLink>
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
                  {w.last_activity ? timeAgo(w.last_activity) : "geen activiteit"}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-[var(--radius-panel)] border border-line bg-surface px-5 py-8 text-ink-2">
            Het leaderboard vult zich met de eerste gevolgde transacties.
          </p>
        )}
      </section>

      {/* PRIJZEN */}
      <section id="prijzen" className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1040px] px-4 py-24 sm:px-6">
          <h2 className="display mb-10 text-[44px] sm:text-[56px]">Prijzen</h2>
          <PricingTable loggedIn={Boolean(profile)} currentPlan={profile?.plan} />
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[880px] px-4 py-24 sm:px-6">
        <h2 className="display mb-10 text-[44px] sm:text-[56px]">Vragen</h2>
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
            Mis de volgende <span className="text-amber">grote move</span> niet.
          </h2>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/login?mode=signup" size="lg"><Bell className="size-4" /> Maak een gratis account</ButtonLink>
            {SITE.telegramPublic && (
              <ButtonLink href={SITE.telegramPublic} variant="ghost" size="lg" external>Telegram</ButtonLink>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
