import type { Chain } from "@/lib/chain/types";

export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

/** Uur-candles van GeckoTerminal (gratis, geen key). Leeg bij een fout. */
export async function getHourlyCandles(chain: Chain, pool: string, hours = 168): Promise<Candle[]> {
  const network = chain === "eth" ? "eth" : "solana";
  try {
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${pool}/ohlcv/hour?aggregate=1&limit=${hours}&currency=usd`,
      { headers: { accept: "application/json" }, next: { revalidate: 300 }, signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: { attributes?: { ohlcv_list?: number[][] } } };
    return (data.data?.attributes?.ohlcv_list ?? [])
      .map(([t, o, h, l, c, v]) => ({ t: t * 1000, o, h, l, c, v }))
      .sort((a, b) => a.t - b.t);
  } catch {
    return [];
  }
}
