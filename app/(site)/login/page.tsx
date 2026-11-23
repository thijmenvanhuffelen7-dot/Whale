import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/site/login-form";
import { getUser } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inloggen", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") ? sp.next : "/app";
  if (await getUser().catch(() => null)) redirect(next);
  const signup = sp.mode === "signup";
  return (
    <div className="mx-auto grid max-w-[1040px] gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
      <div>
        <h1 className="display text-[52px] sm:text-[64px]">{signup ? "Start gratis" : "Welkom terug"}</h1>
        <p className="mt-4 max-w-[38ch] text-[16px] text-ink-2">
          {signup
            ? "Een account kost niets. Je krijgt de feed, een watchlist en 3 analyses per dag. Geen wachtwoord nodig."
            : "Log in met Google of met een link in je mail. Geen wachtwoord nodig."}
        </p>
      </div>
      <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-6 sm:p-8">
        {sp.error && <p role="alert" className="mb-5 text-sm text-sell">Die inloglink werkt niet meer. Vraag een nieuwe aan.</p>}
        <LoginForm next={next} configured={supabaseConfigured()} />
        <p className="mt-6 text-[12px] text-ink-3">We vragen nooit om je wallet of seed phrase.</p>
      </div>
    </div>
  );
}
