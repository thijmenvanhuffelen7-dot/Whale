import type { Metadata } from "next";
import { PricingTable } from "@/components/site/pricing-table";
import { Faq } from "@/components/site/faq";
import { getProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start free with a delayed feed, or go Pro for real-time alerts, unlimited following and personal Telegram DMs.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ canceled?: string }> }) {
  const profile = await getProfile().catch(() => null);
  const { canceled } = await searchParams;
  return (
    <div className="mx-auto max-w-[1040px] px-4 py-16 sm:px-6">
      <h1 className="display text-[56px] sm:text-[76px]">Pricing</h1>
      <p className="mt-4 max-w-[52ch] text-[17px] text-ink-2">Start free. Go Pro when you want to see everything instantly.</p>
      {canceled && <p role="status" className="mt-6 text-sm text-ink-2">Payment cancelled. You have not been charged.</p>}
      <div className="mt-12">
        <PricingTable loggedIn={Boolean(profile)} currentPlan={profile?.plan} />
      </div>
      <h2 className="display mt-24 mb-8 text-[40px]">Questions</h2>
      <Faq />
    </div>
  );
}
