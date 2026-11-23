import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { parseHelius } from "@/lib/chain/helius";
import { parseAlchemy, verifyAlchemySignature } from "@/lib/chain/alchemy";
import heliusSwap from "@/fixtures/helius/swap-buy-bonk.json";
import heliusTransfers from "@/fixtures/helius/transfers-mixed.json";
import alchemySwap from "@/fixtures/alchemy/swap-sell-pepe.json";
import alchemyWithdrawal from "@/fixtures/alchemy/withdrawal-and-stable.json";

const SOL_WHALE = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const ETH_WHALE = "0xabcdef0123456789abcdef0123456789abcdef01";

describe("Helius parser", () => {
  it("herkent een SOL→BONK swap als swap_buy en telt WSOL niet dubbel", () => {
    const events = parseHelius(heliusSwap, new Set([SOL_WHALE]));
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.type).toBe("swap_buy");
    expect(e.walletAddress).toBe(SOL_WHALE);
    expect(e.tokenAddress).toBe(BONK);
    expect(e.amount).toBe(12_400_000);
    expect(e.quote?.tokenSymbol).toBe("SOL");
    expect(e.quote?.amount).toBeCloseTo(120, 6); // niet 240 en geen rent
    expect(e.blockTime?.toISOString()).toBe("2025-11-23T08:00:00.000Z");
  });

  it("maakt een transfer met tegenpartij, slaat mislukte tx over", () => {
    const events = parseHelius(heliusTransfers, new Set([SOL_WHALE]));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "transfer",
      direction: "out",
      amount: 5000,
      tokenSymbol: "SOL",
      counterparty: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    });
  });

  it("meldt transfers van gevolgde tokens tussen onbekende wallets", () => {
    const events = parseHelius(heliusTransfers, new Set([SOL_WHALE]), new Set([BONK]));
    const watch = events.filter((e) => e.tokenAddress === BONK);
    expect(watch).toHaveLength(1);
    expect(watch[0].walletAddress).toBe("RandomA1111111111111111111111111111111111111");
    expect(watch[0].logIndex).toBeGreaterThanOrEqual(10_000);
  });

  it("geeft niets terug als er geen gevolgde wallet in zit", () => {
    expect(parseHelius(heliusSwap, new Set(["Someone1111111111111111111111111111111111111"]))).toEqual([]);
  });

  it("gooit bij een payload die geen array is", () => {
    expect(() => parseHelius({ foo: 1 }, new Set())).toThrow();
  });

  it("is deterministisch (zelfde logIndex bij opnieuw versturen → dedupe werkt)", () => {
    const a = parseHelius(heliusSwap, new Set([SOL_WHALE]));
    const b = parseHelius(heliusSwap, new Set([SOL_WHALE]));
    expect(a.map((e) => [e.txHash, e.logIndex])).toEqual(b.map((e) => [e.txHash, e.logIndex]));
  });
});

describe("Alchemy parser", () => {
  it("herkent token→ETH als swap_sell, adressen lowercase", () => {
    const events = parseAlchemy(alchemySwap, new Set([ETH_WHALE]));
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.type).toBe("swap_sell");
    expect(e.txHash).toBe("0x8f3c0d9e2b6a1e7c5d4b3a2918f7e6d5c4b3a2918f7e6d5c4b3a2918f7e6d5c4");
    expect(e.tokenSymbol).toBe("PEPE");
    expect(e.amount).toBe(1_000_000_000);
    expect(e.quote).toMatchObject({ tokenSymbol: "ETH", amount: 4.52 });
  });

  it("parsed transfers in en uit, gebruikt rawValue als value ontbreekt, negeert NFT's", () => {
    const events = parseAlchemy(alchemyWithdrawal, new Set([ETH_WHALE]));
    expect(events).toHaveLength(2);
    const inbound = events.find((e) => e.tokenSymbol === "ETH")!;
    expect(inbound).toMatchObject({ direction: "in", amount: 2500, counterparty: "0x28c6c06298d514db089934071355e5743bf21d60" });
    const usdc = events.find((e) => e.tokenSymbol === "USDC")!;
    expect(usdc).toMatchObject({ direction: "out", amount: 12_800_000 });
  });

  it("negeert andere netwerken", () => {
    const other = { ...alchemySwap, event: { ...alchemySwap.event, network: "BASE_MAINNET" } };
    expect(parseAlchemy(other, new Set([ETH_WHALE]))).toEqual([]);
  });

  it("controleert de HMAC-signature", () => {
    const body = JSON.stringify(alchemySwap);
    const sig = createHmac("sha256", "whsec_test").update(body).digest("hex");
    expect(verifyAlchemySignature(body, sig, "whsec_test")).toBe(true);
    expect(verifyAlchemySignature(body, sig, "whsec_other")).toBe(false);
    expect(verifyAlchemySignature(body + " ", sig, "whsec_test")).toBe(false);
    expect(verifyAlchemySignature(body, null, "whsec_test")).toBe(false);
    expect(verifyAlchemySignature(body, "nothex", "whsec_test")).toBe(false);
  });
});
