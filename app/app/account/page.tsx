import { Send } from "lucide-react";
import { requireProfile, planOf } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { unlinkTelegram } from "@/lib/actions";
import { Panel } from "@/components/ui/panel";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { NotifyForm } from "@/components/app/notify-form";
import { SITE } from "@/lib/site";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const p = await requireProfile("/app/account");
  const sp = await searchParams;
  const { data: sub } = await supabaseAdmin()
    .from("subscriptions")
    .select("*")
    .eq("user_id", p.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const plan = planOf(p);
  const deepLink = SITE.botUsername && p.telegram_link_code ? `https://t.me/${SITE.botUsername}?start=${p.telegram_link_code}` : null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="display text-[40px] sm:text-[48px]">Account</h1>
      {sp.checkout === "success" && (
        <p role="status" className="rounded-[var(--radius-panel)] border border-buy/40 bg-buy/10 px-5 py-4 text-[15px]">
          Welkom bij Pro. {p.telegram_user_id ? "Je invite-link voor de Pro-groep staat in je Telegram-DM." : "Koppel Telegram hieronder om je invite-link voor de Pro-groep te krijgen."}
        </p>
      )}

      <Panel title="Abonnement">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[20px] font-medium">{plan.name}</p>
            {sub && p.plan === "pro" && (
              <p className="mt-1 text-sm text-ink-2">
                {sub.cancel_at_period_end ? "Stopt op " : "Verlengt op "}
                {new Date(sub.current_period_end).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                {sub.interval === "year" ? " (jaarlijks)" : " (maandelijks)"}
              </p>
            )}
            {p.plan !== "pro" && <p className="mt-1 text-sm text-ink-2">Vertraagde feed, {plan.analysesPerDay} analyses per dag.</p>}
          </div>
          {p.stripe_customer_id ? (
            <form action="/api/stripe/portal" method="post">
              <button className={buttonClass("ghost")}>Beheer abonnement en facturen</button>
            </form>
          ) : (
            <ButtonLink href="/pricing">Word Pro</ButtonLink>
          )}
        </div>
      </Panel>

      <div id="telegram" className="scroll-mt-24">
        <Panel title="Telegram">
          {p.telegram_user_id ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-[15px]">
                Gekoppeld{p.telegram_username ? <> als <span className="font-medium">@{p.telegram_username}</span></> : null}.
                {p.plan === "pro" && <span className="text-ink-2"> Je hebt toegang tot de Pro-groep.</span>}
              </p>
              <form action={unlinkTelegram}>
                <button className={buttonClass("subtle", "sm")}>Ontkoppelen</button>
              </form>
            </div>
          ) : deepLink ? (
            <div className="flex flex-col gap-3">
              <p className="text-[15px] text-ink-2">Open de bot en druk op Start. Je account wordt dan automatisch gekoppeld.</p>
              <ButtonLink href={deepLink} external className="self-start"><Send className="size-4" /> Open in Telegram</ButtonLink>
              <p className="text-[12px] text-ink-3">Werkt de knop niet? Stuur de bot: <code className="num text-ink">/start {p.telegram_link_code}</code></p>
            </div>
          ) : (
            <p className="text-sm text-ink-2">Telegram koppelen werkt zodra NEXT_PUBLIC_TELEGRAM_BOT_USERNAME is ingesteld.</p>
          )}
        </Panel>
      </div>

      <Panel title="Meldingen">
        <NotifyForm telegram={p.notify_telegram} email={p.notify_email} pro={p.plan === "pro"} linked={Boolean(p.telegram_user_id)} />
      </Panel>
    </div>
  );
}
