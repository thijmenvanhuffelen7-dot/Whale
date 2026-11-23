"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const eur = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export function PricingTable({ loggedIn, currentPlan }: { loggedIn: boolean; currentPlan?: "free" | "pro" }) {
  const [yearly, setYearly] = useState(true);
  const pro = PLANS.pro;
  const perMonth = yearly ? pro.priceYearly / 12 : pro.priceMonthly;
  const saving = Math.round((1 - pro.priceYearly / (pro.priceMonthly * 12)) * 100);

  return (
    <div>
      <div role="radiogroup" aria-label="Betaalperiode" className="mb-8 inline-flex rounded-[var(--radius-ctl)] border border-line-strong p-1">
        {[
          { v: false, l: "Maandelijks" },
          { v: true, l: `Jaarlijks · ${saving}% korting` },
        ].map((o) => (
          <button
            key={o.l}
            role="radio"
            aria-checked={yearly === o.v}
            onClick={() => setYearly(o.v)}
            className={cn(
              "h-8 rounded-[4px] px-3 text-[13px] font-medium transition-colors",
              yearly === o.v ? "bg-surface-2 text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            {o.l}
          </button>
        ))}
      </div>

      <div className="grid gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line md:grid-cols-2">
        <div className="flex flex-col bg-surface p-6 sm:p-8">
          <h3 className="display text-[32px]">Free</h3>
          <p className="mt-2 text-sm text-ink-2">Om te zien of het iets voor je is.</p>
          <p className="mt-6 flex items-baseline gap-1">
            <span className="display text-[52px] tabular-nums">€0</span>
          </p>
          <ul className="mt-6 flex flex-1 flex-col gap-3">
            {PLANS.free.features.map((f) => (
              <li key={f} className="flex gap-3 text-sm text-ink-2"><Check className="mt-0.5 size-4 shrink-0 text-ink-3" />{f}</li>
            ))}
          </ul>
          <a href={loggedIn ? "/app" : "/login?mode=signup"} className={buttonClass("ghost", "lg", "mt-8 w-full")}>
            {currentPlan === "free" ? "Je huidige plan" : "Start gratis"}
          </a>
        </div>

        <div className="relative flex flex-col bg-surface p-6 sm:p-8">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-amber" />
          <h3 className="display text-[32px] text-amber">Pro</h3>
          <p className="mt-2 text-sm text-ink-2">Voor wie elke dag kijkt.</p>
          <p className="mt-6 flex items-baseline gap-2">
            <span className="display text-[52px] tabular-nums">{eur(perMonth)}</span>
            <span className="text-sm text-ink-3">per maand{yearly ? `, ${eur(pro.priceYearly)} per jaar` : ""}</span>
          </p>
          <ul className="mt-6 flex flex-1 flex-col gap-3">
            {pro.features.map((f) => (
              <li key={f} className="flex gap-3 text-sm text-ink"><Check className="mt-0.5 size-4 shrink-0 text-amber" />{f}</li>
            ))}
          </ul>
          {currentPlan === "pro" ? (
            <a href="/app/account" className={buttonClass("ghost", "lg", "mt-8 w-full")}>Abonnement beheren</a>
          ) : loggedIn ? (
            <form action="/api/stripe/checkout" method="post" className="mt-8">
              <input type="hidden" name="interval" value={yearly ? "year" : "month"} />
              <button className={buttonClass("primary", "lg", "w-full")}>Word Pro</button>
            </form>
          ) : (
            <a href="/login?mode=signup&next=/pricing" className={buttonClass("primary", "lg", "mt-8 w-full")}>Word Pro</a>
          )}
          <p className="mt-3 text-center text-[12px] text-ink-3">Opzeggen kan altijd, via je account.</p>
        </div>
      </div>
    </div>
  );
}
