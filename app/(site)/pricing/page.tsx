import type { Metadata } from "next";
import { PricingTable } from "@/components/site/pricing-table";
import { Faq } from "@/components/site/faq";
import { getProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Prijzen",
  description: "Gratis starten met een vertraagde feed, of Pro voor realtime alerts, onbeperkt volgen en eigen Telegram-DM's.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ canceled?: string }> }) {
  const profile = await getProfile().catch(() => null);
  const { canceled } = await searchParams;
  return (
    <div className="mx-auto max-w-[1040px] px-4 py-16 sm:px-6">
      <h1 className="display text-[56px] sm:text-[76px]">Prijzen</h1>
      <p className="mt-4 max-w-[52ch] text-[17px] text-ink-2">Begin gratis. Ga naar Pro als je alles direct wilt zien.</p>
      {canceled && <p role="status" className="mt-6 text-sm text-ink-2">Betaling afgebroken. Er is niets afgeschreven.</p>}
      <div className="mt-12">
        <PricingTable loggedIn={Boolean(profile)} currentPlan={profile?.plan} />
      </div>
      <h2 className="display mt-24 mb-8 text-[40px]">Vragen</h2>
      <Faq />
    </div>
  );
}
