import type { FeedEvent, WalletStat } from "@/lib/data";

/**
 * Alleen voor lokaal design-review (DEMO_DATA=1 en geen database).
 * Er staat dan altijd een "Demo-data"-balk in beeld. Nooit in productie zetten.
 */
export function demoEnabled() {
  return process.env.DEMO_DATA === "1" && !(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const W = [
  { address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", label: "Demo: Fund A", type: "smart_money" as const, chain: "sol" as const },
  { address: "0xabcdef0123456789abcdef0123456789abcdef01", label: "Demo: Whale B", type: "whale" as const, chain: "eth" as const },
  { address: "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1", label: "Demo: Trader C", type: "smart_money" as const, chain: "sol" as const },
  { address: "0x1111111111111111111111111111111111111111", label: "Demo: Whale D", type: "whale" as const, chain: "eth" as const },
];

const ROWS: Omit<FeedEvent, "id" | "created_at">[] = [
  { chain: "sol", tx_hash: "demo1", type: "swap_buy", token_address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", token_symbol: "BONK", amount: 12_400_000_000, usd_value: 284_200, counterparty: null, wallet_address: W[0].address, wallet_label: W[0].label, wallet_type: W[0].type, quote_token_symbol: "SOL", quote_amount: 1420 },
  { chain: "eth", tx_hash: "0xdemo2", type: "exchange_deposit", token_address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", token_symbol: "ETH", amount: 2500, usd_value: 7_850_000, counterparty: "0x28c6c06298d514db089934071355e5743bf21d60", wallet_address: W[1].address, wallet_label: W[1].label, wallet_type: W[1].type, quote_token_symbol: null, quote_amount: null },
  { chain: "sol", tx_hash: "demo3", type: "swap_sell", token_address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", token_symbol: "WIF", amount: 1_800_000, usd_value: 412_000, counterparty: null, wallet_address: W[2].address, wallet_label: W[2].label, wallet_type: W[2].type, quote_token_symbol: "USDC", quote_amount: 412_000 },
  { chain: "eth", tx_hash: "0xdemo4", type: "exchange_withdrawal", token_address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", token_symbol: "USDC", amount: 15_000_000, usd_value: 15_000_000, counterparty: "0x71660c4005ba85c37ccec55d0c4493e66fe775d3", wallet_address: W[3].address, wallet_label: W[3].label, wallet_type: W[3].type, quote_token_symbol: null, quote_amount: null },
  { chain: "eth", tx_hash: "0xdemo5", type: "swap_buy", token_address: "0x6982508145454ce325ddbe47a25d4ec3d2311933", token_symbol: "PEPE", amount: 9_200_000_000, usd_value: 96_400, counterparty: null, wallet_address: W[1].address, wallet_label: W[1].label, wallet_type: W[1].type, quote_token_symbol: "ETH", quote_amount: 30.7 },
  { chain: "sol", tx_hash: "demo6", type: "transfer", token_address: "So11111111111111111111111111111111111111112", token_symbol: "SOL", amount: 5000, usd_value: 1_000_000, counterparty: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin", wallet_address: W[0].address, wallet_label: W[0].label, wallet_type: W[0].type, quote_token_symbol: null, quote_amount: null },
  { chain: "sol", tx_hash: "demo7", type: "swap_buy", token_address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", token_symbol: "BONK", amount: 3_100_000_000, usd_value: 71_000, counterparty: null, wallet_address: W[2].address, wallet_label: W[2].label, wallet_type: W[2].type, quote_token_symbol: "SOL", quote_amount: 355 },
  { chain: "eth", tx_hash: "0xdemo8", type: "exchange_deposit", token_address: "0x6982508145454ce325ddbe47a25d4ec3d2311933", token_symbol: "PEPE", amount: 42_000_000_000, usd_value: 440_000, counterparty: "0x6cc5f688a315f3dc28a7781717a9a798a59fda7b", wallet_address: W[3].address, wallet_label: W[3].label, wallet_type: W[3].type, quote_token_symbol: null, quote_amount: null },
];

export function demoFeed(limit = 50): FeedEvent[] {
  const now = Date.now();
  const out: FeedEvent[] = [];
  for (let i = 0; i < Math.min(limit, 40); i++) {
    const r = ROWS[i % ROWS.length];
    out.push({ ...r, id: `demo-${i}`, tx_hash: `${r.tx_hash}${i}`, created_at: new Date(now - (i * 37 + 3) * 60_000).toISOString() });
  }
  return out;
}

export function demoLeaderboard(): WalletStat[] {
  return W.map((w, i) => ({
    id: `dw${i}`,
    chain: w.chain,
    address: w.address,
    label: w.label,
    type: w.type,
    volume_30d: [48_200_000, 31_900_000, 12_400_000, 8_700_000][i],
    trades_30d: [142, 58, 211, 33][i],
    swaps_30d: [96, 12, 188, 4][i],
    last_activity: new Date(Date.now() - (i + 1) * 23 * 60_000).toISOString(),
  }));
}

export function demoStats() {
  return { tracked_wallets: 4, volume_24h: 25_553_600, alerts_24h: 8 };
}
