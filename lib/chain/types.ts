export type Chain = "eth" | "sol";
export type EventType =
  | "transfer"
  | "swap_buy"
  | "swap_sell"
  | "exchange_deposit"
  | "exchange_withdrawal";

/** Eén relevant event, onafhankelijk van de bron (Helius/Alchemy). */
export type NormalizedEvent = {
  chain: Chain;
  txHash: string;
  /** Uniek per leg binnen een tx (voor dedupe). */
  logIndex: number;
  /** De gevolgde wallet (of bij token-watch: de verzender). */
  walletAddress: string;
  type: EventType;
  tokenAddress: string;
  tokenSymbol: string | null;
  /** Decimaal-gecorrigeerde hoeveelheid. */
  amount: number;
  /** Andere partij bij transfers. */
  counterparty: string | null;
  /** Bij transfers: uit of in vanuit de gevolgde wallet. */
  direction?: "in" | "out";
  /** Voor swaps: wat ertegenover stond. */
  quote?: { tokenAddress: string; tokenSymbol: string | null; amount: number };
  blockTime: Date | null;
  raw: unknown;
};

/** Native munten als "token-adres" (wrapped versies, zodat DexScreener ze kent). */
export const NATIVE = {
  sol: { address: "So11111111111111111111111111111111111111112", symbol: "SOL" },
  eth: { address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", symbol: "ETH" },
} as const;

/** Stablecoins: prijs ~ $1, en "kopen met stables" = buy. */
export const STABLES: Record<Chain, Record<string, string>> = {
  sol: {
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
    Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
    "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo": "PYUSD",
  },
  eth: {
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
    "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
    "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI",
    "0x6c3ea9036406852006290770bedfcaba0e23a0e8": "PYUSD",
    "0x4c9edd5852cd905f086c759e8383e09bff1e68b3": "USDe",
    "0xdc035d45d973e3ec169d2276ddab16f1e407384f": "USDS",
  },
};

export function isStable(chain: Chain, address: string): boolean {
  return normAddr(chain, address) in STABLES[chain];
}

/** "Basis"-asset: native of stable. Iets kopen = basis uitgeven. */
export function isBase(chain: Chain, address: string): boolean {
  return normAddr(chain, address) === NATIVE[chain].address || isStable(chain, address);
}

/** ETH-adressen lowercase; SOL (base58) is hoofdlettergevoelig. */
export function normAddr(chain: Chain, address: string): string {
  return chain === "eth" ? address.toLowerCase() : address;
}

export function isEthAddress(s: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(s);
}

export function isSolAddress(s: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
}
