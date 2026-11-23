import type { Chain } from "@/lib/chain/types";
import type { FeedFilter, FeedEvent } from "@/lib/data";

const TYPES: FeedEvent["type"][] = ["transfer", "swap_buy", "swap_sell", "exchange_deposit", "exchange_withdrawal"];

/** Filters uit URL-parameters, gevalideerd. */
export function parseFeedParams(p: URLSearchParams | Record<string, string | string[] | undefined>): FeedFilter {
  const get = (k: string) => {
    const v = p instanceof URLSearchParams ? p.get(k) : p[k];
    return Array.isArray(v) ? v[0] : (v ?? undefined);
  };
  const chain = get("chain");
  const type = get("type");
  const minUsd = Number(get("minUsd"));
  const token = get("token")?.trim().slice(0, 64);
  const limit = Number(get("limit"));
  return {
    chain: chain === "eth" || chain === "sol" ? (chain as Chain) : undefined,
    type: TYPES.includes(type as FeedEvent["type"]) ? (type as FeedEvent["type"]) : undefined,
    minUsd: Number.isFinite(minUsd) && minUsd > 0 ? minUsd : undefined,
    token: token || undefined,
    before: get("before") || undefined,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 50,
  };
}

export function feedQueryString(f: FeedFilter): string {
  const q = new URLSearchParams();
  if (f.chain) q.set("chain", f.chain);
  if (f.type) q.set("type", f.type);
  if (f.minUsd) q.set("minUsd", String(f.minUsd));
  if (f.token) q.set("token", f.token);
  return q.toString();
}
