import { type Chain, NATIVE, STABLES, isStable, normAddr } from "@/lib/chain/types";

export type TokenInfo = {
  chain: Chain;
  address: string;
  symbol: string;
  name: string | null;
  priceUsd: number;
  /** Totale liquiditeit over alle pairs (USD). Infinity = onbekend maar "groot" (stable/CoinGecko). */
  liquidityUsd: number;
  volume24hUsd: number | null;
  priceChange24hPct: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  pairUrl: string | null;
  /** Pool-adres van het grootste pair (voor de prijs-chart). */
  pairAddress?: string | null;
  source: "dexscreener" | "coingecko" | "stable";
};

const DS_CHAIN: Record<Chain, string> = { eth: "ethereum", sol: "solana" };
const CG_PLATFORM: Record<Chain, string> = { eth: "ethereum", sol: "solana" };
const TTL_MS = 60_000;

const cache = new Map<string, { at: number; value: TokenInfo | null }>();

type DsPair = {
  chainId: string;
  url?: string;
  pairAddress?: string;
  baseToken: { address: string; name?: string; symbol: string };
  quoteToken: { address: string; symbol: string };
  priceUsd?: string;
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  liquidity?: { usd?: number };
  marketCap?: number;
  fdv?: number;
};

async function getJson<T>(url: string, fetchImpl: typeof fetch = fetch): Promise<T | null> {
  try {
    const res = await fetchImpl(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Kies uit alle pairs waar dit token de base is het pair met de meeste liquiditeit. */
export function pairsToInfo(chain: Chain, address: string, pairs: DsPair[]): TokenInfo | null {
  const a = normAddr(chain, address);
  const own = pairs.filter(
    (p) => p.chainId === DS_CHAIN[chain] && normAddr(chain, p.baseToken.address) === a && p.priceUsd,
  );
  if (!own.length) return null;
  own.sort((x, y) => (y.liquidity?.usd ?? 0) - (x.liquidity?.usd ?? 0));
  const top = own[0];
  const sum = (f: (p: DsPair) => number | undefined) => own.reduce((s, p) => s + (f(p) ?? 0), 0);
  return {
    chain,
    address: a,
    symbol: top.baseToken.symbol,
    name: top.baseToken.name ?? null,
    priceUsd: Number(top.priceUsd),
    liquidityUsd: sum((p) => p.liquidity?.usd),
    volume24hUsd: sum((p) => p.volume?.h24),
    priceChange24hPct: top.priceChange?.h24 ?? null,
    marketCapUsd: top.marketCap ?? null,
    fdvUsd: top.fdv ?? null,
    pairUrl: top.url ?? null,
    pairAddress: top.pairAddress ?? null,
    source: "dexscreener",
  };
}

async function fromCoinGecko(chain: Chain, address: string, fetchImpl?: typeof fetch): Promise<TokenInfo | null> {
  const isNative = address === NATIVE[chain].address;
  const url = isNative
    ? `https://api.coingecko.com/api/v3/simple/price?ids=${chain === "eth" ? "ethereum" : "solana"}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true`
    : `https://api.coingecko.com/api/v3/simple/token_price/${CG_PLATFORM[chain]}?contract_addresses=${address}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true`;
  const data = await getJson<Record<string, { usd?: number; usd_24h_vol?: number; usd_24h_change?: number }>>(url, fetchImpl);
  const row = data ? Object.values(data)[0] : undefined;
  if (!row?.usd) return null;
  return {
    chain,
    address,
    symbol: isNative ? NATIVE[chain].symbol : "?",
    name: null,
    priceUsd: row.usd,
    liquidityUsd: Infinity,
    volume24hUsd: row.usd_24h_vol ?? null,
    priceChange24hPct: row.usd_24h_change ?? null,
    marketCapUsd: null,
    fdvUsd: null,
    pairUrl: null,
    source: "coingecko",
  };
}

/** Prijs en info van één token, gecachet per token voor 60 seconden. */
export async function getTokenInfo(
  chain: Chain,
  address: string,
  opts: { fetchImpl?: typeof fetch; noCache?: boolean } = {},
): Promise<TokenInfo | null> {
  const a = normAddr(chain, address);
  const key = `${chain}:${a}`;
  const hit = cache.get(key);
  if (!opts.noCache && hit && Date.now() - hit.at < TTL_MS) return hit.value;

  let value: TokenInfo | null = null;
  if (isStable(chain, a)) {
    value = {
      chain, address: a, symbol: STABLES[chain][a], name: null, priceUsd: 1,
      liquidityUsd: Infinity, volume24hUsd: null, priceChange24hPct: null,
      marketCapUsd: null, fdvUsd: null, pairUrl: null, source: "stable",
    };
  } else {
    const pairs = await getJson<DsPair[]>(
      `https://api.dexscreener.com/tokens/v1/${DS_CHAIN[chain]}/${a}`,
      opts.fetchImpl,
    );
    value = (pairs && pairsToInfo(chain, a, pairs)) || (await fromCoinGecko(chain, a, opts.fetchImpl));
  }
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Zoek een token op ticker (DexScreener search), alleen ETH en SOL. Hoogste liquiditeit wint. */
export async function searchToken(query: string, fetchImpl?: typeof fetch): Promise<TokenInfo | null> {
  const q = query.replace(/^\$/, "").trim();
  if (!q) return null;
  const data = await getJson<{ pairs?: DsPair[] }>(
    `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`,
    fetchImpl,
  );
  const pairs = (data?.pairs ?? []).filter(
    (p) =>
      (p.chainId === "ethereum" || p.chainId === "solana") &&
      p.baseToken.symbol.toUpperCase() === q.toUpperCase(),
  );
  if (!pairs.length) return null;
  pairs.sort((x, y) => (y.liquidity?.usd ?? 0) - (x.liquidity?.usd ?? 0));
  const best = pairs[0];
  const chain: Chain = best.chainId === "ethereum" ? "eth" : "sol";
  return pairsToInfo(chain, best.baseToken.address, pairs);
}

export function clearPriceCache() {
  cache.clear();
}
