import { supabaseAdmin } from "@/lib/supabase/admin";
import { Panel, Empty } from "@/components/ui/panel";
import { TestAlertButton } from "@/components/admin/forms";
import { CountChart } from "@/components/charts/charts";
import { isActiveStatus } from "@/lib/stripe";
import { formatUsd } from "@/lib/format";
import { timeAgo } from "@/lib/time";

const eur = (cents: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);

function perDay<T>(rows: T[], dateOf: (r: T) => string, valueOf: (r: T) => number, days = 14) {
  const map = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) map.set(new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10), 0);
  for (const r of rows) {
    const d = dateOf(r).slice(0, 10);
    if (map.has(d)) map.set(d, map.get(d)! + valueOf(r));
  }
  return [...map.entries()].map(([day, v]) => ({ day, v }));
}

export default async function AdminHome() {
  const db = supabaseAdmin();
  const since = new Date(Date.now() - 14 * 86400_000).toISOString();
  const [users, pros, subs, alerts, ai, failures] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("plan", "pro"),
    db.from("subscriptions").select("status, amount_cents, interval, user_id, current_period_end, cancel_at_period_end, profiles(email)").order("updated_at", { ascending: false }).limit(200),
    db.from("events").select("created_at").eq("alerted", true).gte("created_at", since).limit(20000),
    db.from("ai_usage").select("created_at, cost_usd, input_tokens, output_tokens").gte("created_at", since).limit(20000),
    db.from("webhook_failures").select("id, source, error, created_at").order("created_at", { ascending: false }).limit(25),
  ]);

  const active = (subs.data ?? []).filter((s) => isActiveStatus(s.status));
  const mrrCents = active.reduce((sum, s) => sum + (s.interval === "year" ? (s.amount_cents ?? 0) / 12 : (s.amount_cents ?? 0)), 0);
  const alertsPerDay = perDay(alerts.data ?? [], (r) => r.created_at, () => 1);
  const aiPerDay = perDay(ai.data ?? [], (r) => r.created_at, (r) => Number(r.cost_usd));
  const aiTotal = aiPerDay.reduce((s, d) => s + d.v, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-[40px] sm:text-[48px]">Overzicht</h1>
        <TestAlertButton />
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line lg:grid-cols-4">
        {[
          ["Gebruikers", String(users.count ?? 0)],
          ["Pro", String(pros.count ?? 0)],
          ["MRR", eur(mrrCents)],
          ["AI-kosten, 14 dagen", "$" + aiTotal.toFixed(2)],
        ].map(([k, v]) => (
          <div key={k} className="bg-surface px-5 py-4">
            <dt className="text-[12px] text-ink-3">{k}</dt>
            <dd className="num mt-1 text-[24px] font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Alerts per dag (verstuurd)">
          <CountChart data={alertsPerDay} label="Alerts" />
        </Panel>
        <Panel title="AI-kosten per dag (schatting, USD)">
          <ul className="num grid grid-cols-2 gap-x-6 gap-y-1 text-[13px] sm:grid-cols-3">
            {aiPerDay.map((d) => (
              <li key={d.day} className="flex justify-between gap-2 border-b border-line py-1.5">
                <span className="text-ink-3">{d.day.slice(5)}</span>
                <span>${d.v.toFixed(3)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Abonnementen" bodyClassName="p-0 sm:p-0">
        {subs.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[12px] text-ink-3">
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 font-normal">E-mail</th><th className="px-5 py-2.5 font-normal">Status</th><th className="px-5 py-2.5 font-normal">Plan</th><th className="px-5 py-2.5 font-normal">Tot</th>
                </tr>
              </thead>
              <tbody>
                {subs.data.map((s, i) => (
                  <tr key={i} className="border-b border-line last:border-b-0">
                    <td className="px-5 py-3">{(s.profiles as unknown as { email: string } | null)?.email ?? s.user_id}</td>
                    <td className={"px-5 py-3 " + (isActiveStatus(s.status) ? "text-buy" : "text-ink-3")}>{s.status}{s.cancel_at_period_end ? " (stopt)" : ""}</td>
                    <td className="num px-5 py-3">{s.amount_cents ? eur(s.amount_cents) : "—"} / {s.interval === "year" ? "jaar" : "maand"}</td>
                    <td className="num px-5 py-3 text-ink-2">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("nl-NL") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5"><Empty title="Nog geen abonnementen." /></div>
        )}
      </Panel>

      <Panel title="Mislukte webhooks en berichten" bodyClassName="p-0 sm:p-0">
        {failures.data?.length ? (
          <ul>
            {failures.data.map((f) => (
              <li key={f.id} className="grid gap-1 border-b border-line px-5 py-3 last:border-b-0 sm:grid-cols-[90px_120px_1fr]">
                <span className="num text-[12px] text-ink-3">{timeAgo(f.created_at)}</span>
                <span className="text-[13px] font-medium text-sell">{f.source}</span>
                <code className="num break-all text-[12px] text-ink-2">{f.error}</code>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-5"><Empty title="Geen fouten. Mooi zo." /></div>
        )}
      </Panel>
      <p className="text-[12px] text-ink-3">AI-kosten zijn een schatting op basis van tokens × lijstprijs; op de gratis tier van Groq betaal je {formatUsd(0)}.</p>
    </div>
  );
}
