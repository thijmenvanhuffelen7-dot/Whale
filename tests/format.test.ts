import { describe, expect, it } from "vitest";
import { formatAlert, type AlertEvent } from "@/lib/alerts/format";
import { compact, formatUsd } from "@/lib/format";

const base: AlertEvent = {
  chain: "sol",
  txHash: "5h6xSig",
  type: "swap_buy",
  tokenAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  tokenSymbol: "BONK",
  amount: 12_400_000,
  usdValue: 84_200,
  counterparty: null,
  counterpartyLabel: null,
  quoteSymbol: "SOL",
  quoteAmount: 120,
};
const wallet = { address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", label: "Smart Whale 1", type: "smart_money" as const };

describe("getallen", () => {
  it("Engelse notatie", () => {
    expect(formatUsd(84_200)).toBe("$84,200");
    expect(formatUsd(12_345_678)).toBe("$12.3M");
    expect(compact(12_400_000)).toBe("12.4M");
    expect(compact(1_000_000_000)).toBe("1B");
    expect(compact(0.000012345)).toBe("0.00001235");
  });
});

describe("formatAlert", () => {
  it("smart-money buy zoals in de spec", () => {
    const html = formatAlert(wallet, [base]);
    expect(html).toContain("<b>🧠 Smart money buys — SOL</b>");
    expect(html).toContain("Wallet: <b>Smart Whale 1</b> (<code>7xKX…gAsU</code>)");
    expect(html).toContain("Bought: 12.4M $BONK (~$84,200) with 120 $SOL");
    expect(html).toContain('<a href="https://solscan.io/tx/5h6xSig">Solscan</a>');
    expect(html).toContain('<a href="https://dexscreener.com/solana/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263">DexScreener</a>');
  });

  it("exchange-storting met exchange-naam", () => {
    const html = formatAlert({ ...wallet, type: "whale" }, [
      { ...base, chain: "eth", type: "exchange_deposit", tokenSymbol: "ETH", amount: 2500, usdValue: 7_500_000, counterparty: "0x28c6", counterpartyLabel: "Binance", quoteSymbol: null, quoteAmount: null },
    ]);
    expect(html).toContain("🏦 Deposit to Binance — ETH");
    expect(html).toContain("Deposited: 2.5K $ETH (~$7,500,000) to Binance");
    expect(html).toContain("etherscan.io/tx/");
  });

  it("bundelt meerdere swaps in één bericht", () => {
    const html = formatAlert(wallet, [base, { ...base, txHash: "tx2", type: "swap_sell", tokenSymbol: "WIF" }]);
    expect(html).toContain("2 transactions — SOL");
    expect(html.match(/Solscan/g)).toHaveLength(2);
  });

  it("escapet labels en token-symbolen (spam-tokens met HTML)", () => {
    const html = formatAlert({ ...wallet, label: "<script>" }, [{ ...base, tokenSymbol: '<a href="x">' }]);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("$&lt;a href=&quot;x&quot;&gt;");
  });
});
