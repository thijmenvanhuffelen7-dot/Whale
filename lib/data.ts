import { supabaseAdmin } from "@/lib/supabase/admin";
import { type Chain, normAddr } from "@/lib/chain/types";
import { demoEnabled, demoFeed, demoLeaderboard, demoStats } from "@/lib/demo";

export type FeedEvent = {
  id: string;
  chain: Chain;
  tx_hash: string;
  type: "transfer" | "swap_buy" | "swap_sell" | "exchange_deposit" | "exchange_withdrawal";
  token_address: string | null;
  token_symbol: string | null;
  amount: number;
  usd_value: number | null;
  counterparty: string | null;
  created_at: string;
  wallet_address: string | null;
  wallet_label: string | null;
  wallet_type: "smart_money" | "whale" | "exchange" | null;
  quote_token_symbol: string | null;
  quote_amount: number | null;
};

export type WalletStat = {
  id: string;
  chain: Chain;
  address: string;
  label: string;
  type: "smart_money" | "whale";
  volume_30d: number;
  trades_30d: number;
  swaps_30d: number;
  last_activity: string | null;
};

export function dbConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Voer een query uit; zonder database of bij een fout: fallback (de site blijft werken). */
async function safe<T>(fallback: T, fn: () => Promise<T>): Promise<T> {
  if (!dbConfigured()) return fallback;
  try {
    return await fn();
  } catch (e) {
    console.error("[data]", e);
    return fallback;
  }
}

const EVENT_COLS =
  "id, chain, tx_hash, type, token_address, token_symbol, amount, usd_value, counterparty, created_at, wallet_address, wallet_label, wallet_type, quote_token_symbol, quote_amount";

function num<T extends Record<string, unknown>>(row: T, keys: (keyof T)[]): T {
  const out = { ...row };
  for (const k of keys) if (out[k] != null) (out as Record<string, unknown>)[k as string] = Number(out[k]);
  return out;
}
const toFeed = (r: Record<string, unknown>) =>
  num(r, ["amount", "usd_value", "quote_amount"]) as unknown as FeedEvent;

export type FeedFilter = {
  chain?: Chain;
  type?: FeedEvent["type"];
  minUsd?: number;
  token?: string;
  wallet?: string;
  before?: string;
  limit?: number;
};

/**
 * Feed-events. `realtime` (Pro) leest de tabel zelf; anders de publieke view,
 * die in de database al 15 minuten vertraagd is.
 */
export async function getFeed(f: FeedFilter, realtime = false): Promise<FeedEvent[]> {
  if (demoEnabled()) {
    return demoFeed(f.limit ?? 50).filter(
      (e) =>
        (!f.chain || e.chain === f.chain) &&
        (!f.type || e.type === f.type) &&
        (!f.minUsd || (e.usd_value ?? 0) >= f.minUsd) &&
        (!f.wallet || e.wallet_address === f.wallet) &&
        (!f.token || e.token_address === f.token || e.token_symbol?.toLowerCase() === f.token.replace(/^\$/, "").toLowerCase()),
    );
  }
  return safe([], async () => {
    const db = supabaseAdmin();
    let q = realtime
      ? db
          .from("events")
          .select(
            "id, chain, tx_hash, type, token_address, token_symbol, amount, usd_value, counterparty, created_at, wallet_address, quote_token_symbol, quote_amount, wallets(label, type)",
          )
          .is("filter_reason", null)
      : db.from("public_events").select(EVENT_COLS);
    if (f.chain) q = q.eq("chain", f.chain);
    if (f.type) q = q.eq("type", f.type);
    if (f.minUsd) q = q.gte("usd_value", f.minUsd);
    if (f.token) {
      const t = f.token.replace(/^\$/, "");
      q = /^(0x|[1-9A-HJ-NP-Za-km-z]{32,})/.test(t)
        ? q.eq("token_address", f.chain ? normAddr(f.chain, t) : t)
        : q.ilike("token_symbol", t);
    }
    if (f.wallet) q = q.eq("wallet_address", f.wallet);
    if (f.before) q = q.lt("created_at", f.before);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(Math.min(f.limit ?? 50, 200));
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => {
      if (!realtime) return toFeed(r);
      const w = r.wallets as { label: string; type: FeedEvent["wallet_type"] } | null;
      return toFeed({ ...r, wallet_label: w?.label ?? null, wallet_type: w?.type ?? null, wallets: undefined });
    });
  });
}

export async function getStats() {
  if (demoEnabled()) return demoStats();
  return safe({ tracked_wallets: 0, volume_24h: 0, alerts_24h: 0 }, async () => {
    const { data, error } = await supabaseAdmin().from("public_stats").select("*").single();
    if (error) throw error;
    return {
      tracked_wallets: Number(data.tracked_wallets),
      volume_24h: Number(data.volume_24h),
      alerts_24h: Number(data.alerts_24h),
    };
  });
}

export type WalletSort = "volume" | "trades" | "recent";

export async function getLeaderboard(sort: WalletSort = "volume", limit = 100): Promise<WalletStat[]> {
  if (demoEnabled()) {
    const rows = demoLeaderboard();
    const key = sort === "trades" ? "trades_30d" : sort === "recent" ? "last_activity" : "volume_30d";
    return rows.sort((a, b) => String(b[key]).localeCompare(String(a[key]), undefined, { numeric: true })).slice(0, limit);
  }
  return safe([], async () => {
    const col = sort === "trades" ? "trades_30d" : sort === "recent" ? "last_activity" : "volume_30d";
    const { data, error } = await supabaseAdmin()
      .from("public_wallet_stats")
      .select("*")
      .order(col, { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => num(r, ["volume_30d", "trades_30d", "swaps_30d"]) as WalletStat);
  });
}

export async function getWallet(chain: Chain, address: string) {
  if (demoEnabled()) return demoLeaderboard().find((w) => w.chain === chain && w.address === normAddr(chain, address)) ?? null;
  return safe(null, async () => {
    const { data } = await supabaseAdmin()
      .from("public_wallet_stats")
      .select("*")
      .eq("chain", chain)
      .eq("address", normAddr(chain, address))
      .maybeSingle();
    return data ? (num(data, ["volume_30d", "trades_30d", "swaps_30d"]) as WalletStat) : null;
  });
}

/** Instroom/uitstroom van exchanges per dag (laatste 30 dagen). */
export function exchangeFlowsByDay(events: FeedEvent[], days = 30) {
  const map = new Map<string, { day: string; in: number; out: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    map.set(d, { day: d, in: 0, out: 0 });
  }
  for (const e of events) {
    const d = e.created_at.slice(0, 10);
    const row = map.get(d);
    if (!row) continue;
    if (e.type === "exchange_withdrawal") row.in += e.usd_value ?? 0;
    if (e.type === "exchange_deposit") row.out += e.usd_value ?? 0;
  }
  return [...map.values()];
}

/** Whale-instroom (kopen) vs. -uitstroom (verkopen) van één token per dag. */
export function tokenFlowsByDay(events: FeedEvent[], days = 14) {
  const map = new Map<string, { day: string; buy: number; sell: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    map.set(d, { day: d, buy: 0, sell: 0 });
  }
  for (const e of events) {
    const row = map.get(e.created_at.slice(0, 10));
    if (!row) continue;
    if (e.type === "swap_buy" || e.type === "exchange_withdrawal") row.buy += e.usd_value ?? 0;
    if (e.type === "swap_sell" || e.type === "exchange_deposit") row.sell += e.usd_value ?? 0;
  }
  return [...map.values()];
}

export function topTokens(events: FeedEvent[], n = 6) {
  const map = new Map<string, { chain: Chain; address: string; symbol: string; usd: number; count: number }>();
  for (const e of events) {
    if (!e.token_address) continue;
    const k = `${e.chain}:${e.token_address}`;
    const t = map.get(k) ?? { chain: e.chain, address: e.token_address, symbol: e.token_symbol ?? "?", usd: 0, count: 0 };
    t.usd += e.usd_value ?? 0;
    t.count++;
    map.set(k, t);
  }
  return [...map.values()].sort((a, b) => b.usd - a.usd).slice(0, n);
}
