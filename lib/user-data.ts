import { supabaseAdmin } from "@/lib/supabase/admin";
import type { FeedEvent } from "@/lib/data";
import type { Profile } from "@/lib/auth";

export type WatchItem = {
  id: string;
  kind: "wallet" | "token";
  chain: "eth" | "sol";
  address: string;
  label: string | null;
  min_usd: number;
  created_at: string;
};

export async function getWatchlist(userId: string): Promise<WatchItem[]> {
  const { data } = await supabaseAdmin().from("watchlist").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  return (data ?? []).map((r) => ({ ...r, min_usd: Number(r.min_usd) })) as WatchItem[];
}

/** Events die bij de watchlist van de gebruiker passen. Pro realtime, Free vertraagd. */
export async function getMyAlerts(p: Profile, list: WatchItem[], limit = 30): Promise<FeedEvent[]> {
  const wallets = list.filter((w) => w.kind === "wallet").map((w) => w.address);
  const tokens = list.filter((w) => w.kind === "token").map((w) => w.address);
  if (!wallets.length && !tokens.length) return [];
  const ors = [
    wallets.length ? `wallet_address.in.(${wallets.join(",")})` : null,
    tokens.length ? `token_address.in.(${tokens.join(",")})` : null,
  ]
    .filter(Boolean)
    .join(",");
  const realtime = p.plan === "pro";
  const db = supabaseAdmin();
  const q = realtime
    ? db
        .from("events")
        .select("id, chain, tx_hash, type, token_address, token_symbol, amount, usd_value, counterparty, created_at, wallet_address, quote_token_symbol, quote_amount, wallets(label, type)")
        .is("filter_reason", null)
    : db.from("public_events").select("*");
  const { data } = await q.or(ors).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []).map((r: Record<string, unknown>) => {
    const w = (r.wallets as { label: string; type: FeedEvent["wallet_type"] } | null) ?? null;
    return {
      ...(r as unknown as FeedEvent),
      amount: Number(r.amount),
      usd_value: r.usd_value == null ? null : Number(r.usd_value),
      quote_amount: r.quote_amount == null ? null : Number(r.quote_amount),
      wallet_label: (r.wallet_label as string | null) ?? w?.label ?? null,
      wallet_type: (r.wallet_type as FeedEvent["wallet_type"]) ?? w?.type ?? null,
    };
  });
}
