import { describe, expect, it } from "vitest";
import { evaluateEvent, type FilterSettings, type WalletRow } from "@/lib/alerts/evaluate";
import type { NormalizedEvent } from "@/lib/chain/types";
import type { TokenInfo } from "@/lib/prices";

const W = "0xabcdef0123456789abcdef0123456789abcdef01";
const W2 = "0x9999999999999999999999999999999999999999";
const BINANCE = "0x28c6c06298d514db089934071355e5743bf21d60";
const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const PEPE = "0x6982508145454ce325ddbe47a25d4ec3d2311933";

const wallets = new Map<string, WalletRow>([
  [W, { id: "w1", chain: "eth", address: W, label: "Fund A", type: "whale", entity: "FundA" }],
  [W2, { id: "w2", chain: "eth", address: W2, label: "Fund A cold", type: "whale", entity: "FundA" }],
  [BINANCE, { id: "x1", chain: "eth", address: BINANCE, label: "Binance 14", type: "exchange", entity: "Binance" }],
]);

const settings: FilterSettings = {
  thresholdUsd: 250_000,
  swapThresholdUsd: 10_000,
  minLiquidityUsd: 10_000,
  paused: false,
  tokenThresholds: new Map(),
};

function info(address: string, symbol: string, priceUsd: number, liquidityUsd = 1e9): TokenInfo {
  return {
    chain: "eth", address, symbol, name: null, priceUsd, liquidityUsd,
    volume24hUsd: null, priceChange24hPct: null, marketCapUsd: null, fdvUsd: null, pairUrl: null, source: "dexscreener",
  };
}

function ev(p: Partial<NormalizedEvent>): NormalizedEvent {
  return {
    chain: "eth", txHash: "0x1", logIndex: 0, walletAddress: W, type: "transfer",
    tokenAddress: WETH, tokenSymbol: "ETH", amount: 1, counterparty: null, direction: "out",
    blockTime: null, raw: null, ...p,
  };
}

describe("evaluateEvent", () => {
  it("transfer van een exchange naar een whale = exchange_withdrawal", () => {
    const r = evaluateEvent(ev({ amount: 2500, counterparty: BINANCE, direction: "in" }), {
      wallets, price: info(WETH, "WETH", 3000), quotePrice: null, settings,
    });
    expect(r).toMatchObject({ type: "exchange_withdrawal", usdValue: 7_500_000, filterReason: null, walletId: "w1" });
  });

  it("transfer naar een exchange = exchange_deposit", () => {
    const r = evaluateEvent(ev({ amount: 100, counterparty: BINANCE }), {
      wallets, price: info(WETH, "WETH", 3000), quotePrice: null, settings,
    });
    expect(r.type).toBe("exchange_deposit");
  });

  it("filtert onder de drempel, swaps hebben hun eigen drempel", () => {
    const small = evaluateEvent(ev({ amount: 10 }), { wallets, price: info(WETH, "WETH", 3000), quotePrice: null, settings });
    expect(small.filterReason).toBe("below_threshold");

    const swap = evaluateEvent(
      ev({ type: "swap_buy", tokenAddress: PEPE, tokenSymbol: "PEPE", amount: 1e9, quote: { tokenAddress: WETH, tokenSymbol: "ETH", amount: 10 } }),
      { wallets, price: info(PEPE, "PEPE", 0.00001), quotePrice: info(WETH, "WETH", 3000), settings },
    );
    // USD via de quote-kant: 10 ETH × 3000
    expect(swap).toMatchObject({ filterReason: null, usdValue: 30_000, tokenSymbol: "PEPE" });
  });

  it("per-token drempel uit tokens_watch gaat voor", () => {
    const r = evaluateEvent(ev({ tokenAddress: PEPE, amount: 1e10 }), {
      wallets, price: info(PEPE, "PEPE", 0.00001), quotePrice: null,
      settings: { ...settings, tokenThresholds: new Map([[PEPE, 50_000]]) },
    });
    expect(r).toMatchObject({ usdValue: 100_000, filterReason: null });
  });

  it("dust/spam: te weinig liquiditeit", () => {
    const r = evaluateEvent(ev({ tokenAddress: PEPE, amount: 1e12 }), {
      wallets, price: info(PEPE, "SCAM", 1, 5_000), quotePrice: null, settings,
    });
    expect(r.filterReason).toBe("low_liquidity");
  });

  it("geen prijs = niet melden", () => {
    const r = evaluateEvent(ev({ tokenAddress: PEPE }), { wallets, price: null, quotePrice: null, settings });
    expect(r.filterReason).toBe("no_price");
  });

  it("stablecoins tussen wallets van dezelfde eigenaar negeren", () => {
    const r = evaluateEvent(ev({ tokenAddress: USDC, tokenSymbol: "USDC", amount: 12_800_000, counterparty: W2 }), {
      wallets, price: info(USDC, "USDC", 1), quotePrice: null, settings,
    });
    expect(r.filterReason).toBe("same_owner");
  });

  it("wallet die alleen in een gebruikers-watchlist staat: niet in de groep", () => {
    const r = evaluateEvent(ev({ walletAddress: "0x7777777777777777777777777777777777777777", amount: 1000 }), {
      wallets, price: info(WETH, "WETH", 3000), quotePrice: null, settings,
    });
    expect(r).toMatchObject({ filterReason: "watchlist_only", walletId: null, usdValue: 3_000_000 });
  });

  it("gepauzeerd = opslaan maar niet melden", () => {
    const r = evaluateEvent(ev({ amount: 1000 }), {
      wallets, price: info(WETH, "WETH", 3000), quotePrice: null, settings: { ...settings, paused: true },
    });
    expect(r.filterReason).toBe("paused");
  });
});
