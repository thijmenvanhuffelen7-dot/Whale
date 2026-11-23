import type { Api } from "grammy";
import { type Chain, type NormalizedEvent, normAddr } from "@/lib/chain/types";
import { evaluateEvent, type FilterSettings, type WalletRow } from "@/lib/alerts/evaluate";
import { formatAlert, type AlertEvent } from "@/lib/alerts/format";
import { getTokenInfo, type TokenInfo } from "@/lib/prices";
import { getAllSettings, type Settings } from "@/lib/settings";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendWithRetry } from "@/lib/telegram/send";

/** Alle wallets (incl. exchange-labels) per chain, geïndexeerd op adres. */
export async function loadWallets(chain: Chain): Promise<Map<string, WalletRow>> {
  const { data, error } = await supabaseAdmin()
    .from("wallets")
    .select("id, chain, address, label, type, entity")
    .eq("chain", chain)
    .eq("active", true);
  if (error) throw error;
  return new Map((data ?? []).map((w) => [normAddr(chain, w.address), w as WalletRow]));
}

/** Adressen waarvan we zelf activiteit volgen (geen exchanges: te veel volume). */
export function trackedSet(wallets: Map<string, WalletRow>): Set<string> {
  return new Set([...wallets.values()].filter((w) => w.type !== "exchange").map((w) => w.address));
}

export async function loadTokenThresholds(chain: Chain): Promise<Map<string, number>> {
  const { data, error } = await supabaseAdmin()
    .from("tokens_watch")
    .select("address, min_usd_alert")
    .eq("chain", chain);
  if (error) throw error;
  return new Map((data ?? []).map((t) => [normAddr(chain, t.address), Number(t.min_usd_alert)]));
}

/** Adressen uit de watchlists van gebruikers (voor DM-alerts). */
export async function loadWatchlistAddresses(chain: Chain): Promise<{ wallets: string[]; tokens: string[] }> {
  const { data } = await supabaseAdmin().from("watchlist").select("kind, address").eq("chain", chain);
  return {
    wallets: (data ?? []).filter((r) => r.kind === "wallet").map((r) => r.address),
    tokens: (data ?? []).filter((r) => r.kind === "token").map((r) => r.address),
  };
}

export function filterSettings(s: Settings, tokenThresholds: Map<string, number>): FilterSettings {
  return {
    thresholdUsd: Number(s.alert_threshold_usd),
    swapThresholdUsd: Number(s.swap_threshold_usd),
    minLiquidityUsd: Number(s.min_liquidity_usd),
    paused: Boolean(s.alerts_paused),
    tokenThresholds,
  };
}

/** Events beoordelen en opslaan. Dubbele (chain, tx_hash, log_index) worden genegeerd. */
export async function ingestEvents(
  chain: Chain,
  events: NormalizedEvent[],
  ctx: { wallets: Map<string, WalletRow>; settings: FilterSettings },
): Promise<{ inserted: number; alertable: number }> {
  if (!events.length) return { inserted: 0, alertable: 0 };

  // Prijzen parallel ophalen (cache dedupliceert hetzelfde token)
  const tokens = new Set<string>();
  for (const e of events) {
    tokens.add(e.tokenAddress);
    if (e.quote) tokens.add(e.quote.tokenAddress);
  }
  const prices = new Map<string, TokenInfo | null>();
  await Promise.all(
    [...tokens].map(async (t) => prices.set(t, await getTokenInfo(chain, t))),
  );

  const rows = events.map((e) => {
    const ev = evaluateEvent(e, {
      wallets: ctx.wallets,
      price: prices.get(e.tokenAddress) ?? null,
      quotePrice: e.quote ? (prices.get(e.quote.tokenAddress) ?? null) : null,
      settings: ctx.settings,
    });
    const quotePrice = e.quote ? prices.get(e.quote.tokenAddress) : null;
    return {
      chain,
      tx_hash: e.txHash,
      log_index: e.logIndex,
      wallet_id: ev.walletId,
      wallet_address: e.walletAddress,
      type: ev.type,
      token_address: e.tokenAddress,
      token_symbol: ev.tokenSymbol,
      amount: e.amount,
      usd_value: ev.usdValue,
      counterparty: e.counterparty,
      quote_token_address: e.quote?.tokenAddress ?? null,
      quote_token_symbol: quotePrice?.symbol ?? e.quote?.tokenSymbol ?? null,
      quote_amount: e.quote?.amount ?? null,
      block_time: e.blockTime?.toISOString() ?? null,
      filter_reason: ev.filterReason,
      raw: e.raw as object,
    };
  });

  const { data, error } = await supabaseAdmin()
    .from("events")
    .upsert(rows, { onConflict: "chain,tx_hash,log_index", ignoreDuplicates: true })
    .select("id, filter_reason");
  if (error) throw error;
  return {
    inserted: data?.length ?? 0,
    alertable: (data ?? []).filter((r) => r.filter_reason === null).length,
  };
}

export async function logWebhookFailure(source: string, error: unknown, payload?: unknown) {
  try {
    await supabaseAdmin().from("webhook_failures").insert({
      source,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      payload: payload === undefined ? null : (payload as object),
    });
  } catch (e) {
    console.error("[webhook_failures] kon niet loggen", e);
  }
}

type PendingRow = {
  id: string;
  chain: Chain;
  tx_hash: string;
  type: AlertEvent["type"];
  token_address: string;
  token_symbol: string | null;
  amount: string | number;
  usd_value: string | number | null;
  counterparty: string | null;
  quote_token_symbol: string | null;
  quote_amount: string | number | null;
  wallet_address: string;
  wallets: { label: string; type: WalletRow["type"] } | null;
};

/**
 * Verstuur alle openstaande alerts. Per wallet max één bericht per
 * `throttle_seconds`; wat binnen die tijd binnenkomt wordt de volgende keer
 * gebundeld. `alerted` gaat pas op true als Telegram het bericht accepteerde.
 */
export async function dispatchPending(api: Api): Promise<{ sent: number; skipped: number; failed: number }> {
  const db = supabaseAdmin();
  const s = await getAllSettings();
  const result = { sent: 0, skipped: 0, failed: 0 };
  const chatId = s.chat_id ?? (process.env.TELEGRAM_CHAT_ID ? Number(process.env.TELEGRAM_CHAT_ID) : null);
  if (s.alerts_paused || !chatId) return result;

  const since = new Date(Date.now() - 6 * 3600_000).toISOString();
  const { data, error } = await db
    .from("events")
    .select(
      "id, chain, tx_hash, type, token_address, token_symbol, amount, usd_value, counterparty, quote_token_symbol, quote_amount, wallet_address, wallets(label, type)",
    )
    .eq("alerted", false)
    .is("filter_reason", null)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(300);
  if (error) throw error;
  const pending = (data ?? []) as unknown as PendingRow[];
  if (!pending.length) return result;

  // Labels van tegenpartijen (exchanges) in één keer ophalen
  const cps = [...new Set(pending.map((p) => p.counterparty).filter(Boolean))] as string[];
  const cpLabels = new Map<string, string>();
  if (cps.length) {
    const { data: cpRows } = await db
      .from("wallets")
      .select("chain, address, label, entity")
      .in("address", cps);
    for (const r of cpRows ?? []) cpLabels.set(`${r.chain}:${r.address}`, r.entity ?? r.label);
  }

  const groups = new Map<string, PendingRow[]>();
  for (const p of pending) {
    const key = `${p.chain}:${p.wallet_address}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  for (const rows of groups.values()) {
    const { chain, wallet_address } = rows[0];
    const { data: claimed, error: claimErr } = await db.rpc("claim_alert_slot", {
      p_chain: chain,
      p_address: wallet_address,
      p_interval: `${Number(s.throttle_seconds)} seconds`,
    });
    if (claimErr) throw claimErr;
    if (!claimed) {
      result.skipped += rows.length;
      continue;
    }

    const html = formatAlert(
      { address: wallet_address, label: rows[0].wallets?.label ?? null, type: rows[0].wallets?.type ?? null },
      rows.map((r) => ({
        chain: r.chain,
        txHash: r.tx_hash,
        type: r.type,
        tokenAddress: r.token_address,
        tokenSymbol: r.token_symbol,
        amount: Number(r.amount),
        usdValue: r.usd_value == null ? null : Number(r.usd_value),
        counterparty: r.counterparty,
        counterpartyLabel: r.counterparty ? (cpLabels.get(`${r.chain}:${r.counterparty}`) ?? null) : null,
        quoteSymbol: r.quote_token_symbol,
        quoteAmount: r.quote_amount == null ? null : Number(r.quote_amount),
      })),
    );
    const topic = chain === "eth" ? s.topic_eth : s.topic_sol;

    try {
      await sendWithRetry(api, chatId, html, { threadId: topic });
      const { error: upErr } = await db
        .from("events")
        .update({ alerted: true })
        .in("id", rows.map((r) => r.id));
      if (upErr) throw upErr;
      result.sent += rows.length;
    } catch (err) {
      result.failed += rows.length;
      await db.rpc("release_alert_slot", { p_chain: chain, p_address: wallet_address });
      await logWebhookFailure("telegram", err, { event_ids: rows.map((r) => r.id) });
    }
  }
  return result;
}

/** Webhook-handler gedeeld door Helius en Alchemy. */
export async function handleChainWebhook(
  chain: Chain,
  parse: (tracked: Set<string>, watched: Set<string>) => NormalizedEvent[],
) {
  const [wallets, settings, thresholds, watch] = await Promise.all([
    loadWallets(chain),
    getAllSettings(),
    loadTokenThresholds(chain),
    loadWatchlistAddresses(chain),
  ]);
  const tracked = trackedSet(wallets);
  for (const a of watch.wallets) tracked.add(a);
  const events = parse(tracked, new Set([...thresholds.keys(), ...watch.tokens]));
  return ingestEvents(chain, events, { wallets, settings: filterSettings(settings, thresholds) });
}
