import { CountUpUsd, CountUpInt } from "@/components/site/stats-strip-client";

/** Echte cijfers uit de database. Is er nog niets, dan tonen we de strip niet. */
export function StatsStrip({ stats }: { stats: { tracked_wallets: number; volume_24h: number; alerts_24h: number } }) {
  if (!stats.tracked_wallets && !stats.alerts_24h) return null;
  const items = [
    { label: "Gevolgde wallets", node: <CountUpInt value={stats.tracked_wallets} /> },
    { label: "Volume gevolgd, 24 uur", node: <CountUpUsd value={stats.volume_24h} /> },
    { label: "Meldingen, 24 uur", node: <CountUpInt value={stats.alerts_24h} /> },
  ];
  return (
    <section aria-label="Live statistieken" className="border-b border-line">
      <dl className="mx-auto grid max-w-[1240px] grid-cols-1 divide-y divide-line px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6">
        {items.map((i) => (
          <div key={i.label} className="flex items-baseline justify-between gap-4 py-5 sm:flex-col sm:items-start sm:gap-1 sm:px-6 sm:first:pl-0">
            <dt className="text-[13px] text-ink-3">{i.label}</dt>
            <dd className="text-[26px] font-medium text-ink">{i.node}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
