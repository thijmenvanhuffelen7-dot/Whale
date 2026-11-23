import { type Chain, type EventType, type NormalizedEvent, NATIVE, isBase, isStable, normAddr } from "@/lib/chain/types";
import type { TokenInfo } from "@/lib/prices";

export type WalletRow = {
  id: string;
  chain: Chain;
  address: string;
  label: string;
  type: "smart_money" | "whale" | "exchange";
  entity: string | null;
};

export type FilterSettings = {
  thresholdUsd: number;
  swapThresholdUsd: number;
  minLiquidityUsd: number;
  paused: boolean;
  /** Per-token drempel uit tokens_watch (key: genormaliseerd adres). */
  tokenThresholds: Map<string, number>;
};

export type Evaluated = {
  type: EventType;
  walletId: string | null;
  tokenSymbol: string | null;
  usdValue: number | null;
  filterReason: string | null;
};

/**
 * Bepaal het definitieve type (exchange-flow?), de USD-waarde en of het event
 * gemeld mag worden. Puur: geen I/O, makkelijk te testen.
 */
export function evaluateEvent(
  ev: NormalizedEvent,
  ctx: {
    wallets: Map<string, WalletRow>;
    price: TokenInfo | null;
    quotePrice: TokenInfo | null;
    settings: FilterSettings;
  },
): Evaluated {
  const { wallets, price, quotePrice, settings } = ctx;
  const chain = ev.chain;
  const wallet = wallets.get(normAddr(chain, ev.walletAddress)) ?? null;
  const cp = ev.counterparty ? (wallets.get(normAddr(chain, ev.counterparty)) ?? null) : null;

  // 1. Exchange-flows herkennen
  let type: EventType = ev.type;
  if (type === "transfer" && cp?.type === "exchange" && wallet?.type !== "exchange") {
    type = ev.direction === "in" ? "exchange_withdrawal" : "exchange_deposit";
  }

  const symbol = price?.symbol && price.symbol !== "?" ? price.symbol : ev.tokenSymbol;

  // 2. USD-waarde. Bij swaps tegen SOL/ETH/stables is de quote-kant betrouwbaarder.
  let usd: number | null = null;
  if (ev.quote && quotePrice && isBase(chain, ev.quote.tokenAddress)) {
    usd = ev.quote.amount * quotePrice.priceUsd;
  } else if (price) {
    usd = ev.amount * price.priceUsd;
  }
  usd = usd != null && Number.isFinite(usd) ? Math.round(usd * 100) / 100 : null;

  const base = { type, walletId: wallet?.id ?? null, tokenSymbol: symbol, usdValue: usd };
  const reject = (filterReason: string): Evaluated => ({ ...base, filterReason });

  if (settings.paused) return reject("paused");
  if (usd == null || !price) return reject("no_price");

  // 3. Dust/spam: te weinig liquiditeit (native en stables altijd ok)
  const tokenAddr = normAddr(chain, ev.tokenAddress);
  const trustedAsset = tokenAddr === NATIVE[chain].address || isStable(chain, tokenAddr);
  if (!trustedAsset && price.liquidityUsd < settings.minLiquidityUsd) return reject("low_liquidity");

  // 4. Stablecoins schuiven tussen wallets van dezelfde eigenaar
  if (
    type === "transfer" &&
    isStable(chain, tokenAddr) &&
    wallet &&
    cp &&
    ((wallet.entity && wallet.entity === cp.entity) || wallet.label === cp.label)
  ) {
    return reject("same_owner");
  }

  // 5. Drempel (per-token override > swap-drempel/algemene drempel)
  const isSwap = type === "swap_buy" || type === "swap_sell";
  const threshold =
    settings.tokenThresholds.get(tokenAddr) ?? (isSwap ? settings.swapThresholdUsd : settings.thresholdUsd);
  if (usd < threshold) return reject("below_threshold");

  return { ...base, filterReason: null };
}
