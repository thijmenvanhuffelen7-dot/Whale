import type { Api } from "grammy";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatAlert } from "@/lib/alerts/format";
import { sendWithRetry } from "@/lib/telegram/send";
import { SITE } from "@/lib/site";
import type { Chain } from "@/lib/chain/types";

type Ev = {
  id: string;
  chain: Chain;
  tx_hash: string;
  type: "transfer" | "swap_buy" | "swap_sell" | "exchange_deposit" | "exchange_withdrawal";
  token_address: string;
  token_symbol: string | null;
  amount: number | string;
  usd_value: number | string | null;
  counterparty: string | null;
  quote_token_symbol: string | null;
  quote_amount: number | string | null;
  wallet_address: string;
  wallets: { label: string; type: "smart_money" | "whale" | "exchange" } | null;
};

/** Welke watchlist-items matchen welk event, boven de drempel van de gebruiker. Puur. */
export function matchWatchers(
  events: { id: string; chain: string; wallet_address: string; token_address: string; usd_value: number | string | null }[],
  watch: { user_id: string; kind: "wallet" | "token"; chain: string; address: string; min_usd: number | string; label: string | null }[],
) {
  const out: { userId: string; eventId: string; label: string | null }[] = [];
  for (const e of events) {
    const usd = Number(e.usd_value ?? 0);
    for (const w of watch) {
      if (w.chain !== e.chain) continue;
      const hit = w.kind === "wallet" ? w.address === e.wallet_address : w.address === e.token_address;
      if (hit && usd >= Number(w.min_usd)) out.push({ userId: w.user_id, eventId: e.id, label: w.label });
    }
  }
  // Eén melding per gebruiker per event, ook als wallet én token matchen
  const seen = new Set<string>();
  return out.filter((m) => {
    const k = `${m.userId}:${m.eventId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * DM-alerts (en optioneel e-mail) voor Pro-gebruikers met een watchlist.
 * Ook events onder de groepsdrempel tellen mee: de gebruiker kiest zijn eigen drempel.
 */
export async function dispatchUserAlerts(api: Api): Promise<{ sent: number }> {
  const db = supabaseAdmin();
  const since = new Date(Date.now() - 30 * 60_000).toISOString();
  const { data: evs } = await db
    .from("events")
    .select("id, chain, tx_hash, type, token_address, token_symbol, amount, usd_value, counterparty, quote_token_symbol, quote_amount, wallet_address, wallets(label, type)")
    .or("filter_reason.is.null,filter_reason.eq.below_threshold,filter_reason.eq.watchlist_only")
    .not("usd_value", "is", null)
    .gte("created_at", since)
    .limit(300);
  const events = (evs ?? []) as unknown as Ev[];
  if (!events.length) return { sent: 0 };

  const addrs = [...new Set(events.flatMap((e) => [e.wallet_address, e.token_address]))];
  const { data: watch } = await db.from("watchlist").select("user_id, kind, chain, address, min_usd, label").in("address", addrs);
  const matches = matchWatchers(events, watch ?? []);
  if (!matches.length) return { sent: 0 };

  const userIds = [...new Set(matches.map((m) => m.userId))];
  const { data: profiles } = await db
    .from("profiles")
    .select("id, plan, email, telegram_user_id, notify_telegram, notify_email")
    .in("id", userIds)
    .eq("plan", "pro");
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const evById = new Map(events.map((e) => [e.id, e]));

  let sent = 0;
  for (const m of matches) {
    const p = byId.get(m.userId);
    const e = evById.get(m.eventId);
    if (!p || !e) continue;
    const html = formatAlert(
      { address: e.wallet_address, label: e.wallets?.label ?? m.label, type: e.wallets?.type ?? null },
      [
        {
          chain: e.chain, txHash: e.tx_hash, type: e.type, tokenAddress: e.token_address, tokenSymbol: e.token_symbol,
          amount: Number(e.amount), usdValue: e.usd_value == null ? null : Number(e.usd_value),
          counterparty: e.counterparty, counterpartyLabel: null,
          quoteSymbol: e.quote_token_symbol, quoteAmount: e.quote_amount == null ? null : Number(e.quote_amount),
        },
      ],
    );

    for (const channel of ["telegram", "email"] as const) {
      if (channel === "telegram" && !(p.notify_telegram && p.telegram_user_id)) continue;
      if (channel === "email" && !(p.notify_email && p.email && process.env.RESEND_API_KEY)) continue;
      // Claim eerst (dedupe); alleen wie de rij aanmaakt verstuurt
      const { data: claimed } = await db
        .from("user_alerts")
        .upsert({ user_id: p.id, event_id: e.id, channel }, { onConflict: "user_id,event_id,channel", ignoreDuplicates: true })
        .select("user_id");
      if (!claimed?.length) continue;
      try {
        if (channel === "telegram") {
          await sendWithRetry(api, p.telegram_user_id!, `${html}\n\n<i>From your watchlist · ${SITE.url}/app</i>`);
        } else {
          await sendEmail(p.email!, `${SITE.name}: ${e.wallets?.label ?? m.label ?? "wallet"} ${e.token_symbol ? `$${e.token_symbol}` : ""}`, html);
        }
        sent++;
      } catch (err) {
        // Terugdraaien zodat de volgende ronde het opnieuw probeert
        await db.from("user_alerts").delete().match({ user_id: p.id, event_id: e.id, channel });
        console.error("[user-alerts]", channel, err);
      }
    }
  }
  return { sent };
}

/** Telegram-HTML → simpele e-mail-HTML. */
async function sendEmail(to: string, subject: string, telegramHtml: string) {
  const body = telegramHtml.replace(/\n/g, "<br>");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || `${SITE.name} <alerts@example.com>`,
      to,
      subject,
      html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5">${body}<p style="color:#888;font-size:12px">Not financial advice. Information only. Turn off alerts: ${SITE.url}/app/account</p></div>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
}

/**
 * Gratis publiek kanaal (funnel): meldingen die al in de Pro-groep stonden,
 * 15 minuten later doorposten met een link naar Pro.
 */
export async function postPublicDelayed(api: Api): Promise<{ posted: number }> {
  const channel = process.env.TELEGRAM_PUBLIC_CHANNEL_ID;
  if (!channel) return { posted: 0 };
  const db = supabaseAdmin();
  const { data } = await db
    .from("events")
    .select("id, chain, tx_hash, type, token_address, token_symbol, amount, usd_value, counterparty, quote_token_symbol, quote_amount, wallet_address, wallets(label, type)")
    .eq("alerted", true)
    .eq("public_posted", false)
    .lt("created_at", new Date(Date.now() - 15 * 60_000).toISOString())
    .gt("created_at", new Date(Date.now() - 3 * 3600_000).toISOString())
    .order("usd_value", { ascending: false })
    .limit(10);
  let posted = 0;
  for (const e of (data ?? []) as unknown as Ev[]) {
    const html = formatAlert(
      { address: e.wallet_address, label: e.wallets?.label ?? null, type: e.wallets?.type ?? null },
      [
        {
          chain: e.chain, txHash: e.tx_hash, type: e.type, tokenAddress: e.token_address, tokenSymbol: e.token_symbol,
          amount: Number(e.amount), usdValue: e.usd_value == null ? null : Number(e.usd_value),
          counterparty: e.counterparty, counterpartyLabel: null,
          quoteSymbol: e.quote_token_symbol, quoteAmount: e.quote_amount == null ? null : Number(e.quote_amount),
        },
      ],
    );
    try {
      await sendWithRetry(api, channel, `${html}\n\n⏱ <i>Delayed 15 min.</i> Real-time with Pro: ${SITE.url}/pricing`);
      await db.from("events").update({ public_posted: true }).eq("id", e.id);
      posted++;
    } catch (err) {
      console.error("[public-channel]", err);
      break;
    }
  }
  // Te oud om nog te posten: overslaan, zodat de wachtrij niet volloopt
  await db.from("events").update({ public_posted: true }).eq("alerted", true).eq("public_posted", false).lt("created_at", new Date(Date.now() - 3 * 3600_000).toISOString());
  return { posted };
}
