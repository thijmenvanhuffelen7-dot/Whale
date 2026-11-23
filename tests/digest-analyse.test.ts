import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { amsterdamNow, buildDigest, startOfAmsterdamDay, type DigestRow } from "@/lib/digest";
import { aggregateStats, containsAdvice, emptyStats, formatAnalysis, summarize } from "@/lib/analyse";
import { pairsToInfo } from "@/lib/prices";
import { DISCLAIMER } from "@/lib/messages";

const row = (p: Partial<DigestRow>): DigestRow => ({
  chain: "sol", tx_hash: "tx", type: "swap_buy", token_address: "BONK", token_symbol: "BONK",
  amount: 1000, usd_value: 50_000, wallet_address: "A", wallet_label: "Whale A", ...p,
});

describe("digest", () => {
  it("toont grootste moves, actieve wallets en gedeelde buys + disclaimer", () => {
    const html = buildDigest(
      [
        row({ wallet_address: "A", wallet_label: "Whale A", usd_value: 900_000, tx_hash: "t1" }),
        row({ wallet_address: "B", wallet_label: "Whale B", usd_value: 40_000, tx_hash: "t2" }),
        row({ wallet_address: "B", wallet_label: "Whale B", type: "exchange_deposit", token_symbol: "SOL", token_address: "SOL", tx_hash: "t3" }),
      ],
      "23-11-2026",
    );
    expect(html).toContain("Dagelijkse digest — 23-11-2026");
    expect(html).toMatch(/1\. Whale A kocht .*\$900\.000/);
    expect(html).toContain("Whale B: 2 tx");
    expect(html).toContain("Gekocht door meerdere gevolgde wallets");
    expect(html).toContain("2 wallets");
    expect(html).toContain(DISCLAIMER);
  });

  it("lege dag", () => {
    expect(buildDigest([], "x")).toContain("Geen meldingswaardige activiteit");
  });

  it("08:00 Amsterdam valt in de winter op 07:00 UTC en in de zomer op 06:00 UTC", () => {
    expect(amsterdamNow(new Date("2026-01-15T07:10:00Z")).hour).toBe(8);
    expect(amsterdamNow(new Date("2026-07-15T06:10:00Z")).hour).toBe(8);
    expect(amsterdamNow(new Date("2026-07-15T07:10:00Z")).hour).toBe(9);
  });

  it("begin van de dag in Amsterdam", () => {
    expect(startOfAmsterdamDay(new Date("2026-01-15T12:00:00Z")).toISOString()).toBe("2026-01-14T23:00:00.000Z");
    expect(startOfAmsterdamDay(new Date("2026-07-15T12:00:00Z")).toISOString()).toBe("2026-07-14T22:00:00.000Z");
    // 00:30 lokale tijd is nog dezelfde (nieuwe) dag
    expect(startOfAmsterdamDay(new Date("2026-07-14T22:30:00Z")).toISOString()).toBe("2026-07-14T22:00:00.000Z");
  });
});

describe("analyse", () => {
  it("advies-filter vangt koop/voorspel-taal maar laat feiten door", () => {
    expect(containsAdvice("Dit is een goed moment, koop nu.")).toBe(true);
    expect(containsAdvice("De prijs gaat stijgen richting $2.")).toBe(true);
    expect(containsAdvice("Analisten zijn bullish.")).toBe(true);
    expect(containsAdvice("Koersdoel: $5")).toBe(true);
    expect(
      containsAdvice("Drie gevolgde wallets kochten de afgelopen week voor $120.000. De liquiditeit is $2,1M."),
    ).toBe(false);
  });

  it("aggregeert whale-activiteit", () => {
    const s = aggregateStats([
      { type: "swap_buy", usd_value: "100", wallet_label: "A" },
      { type: "swap_buy", usd_value: 50, wallet_label: "B" },
      { type: "swap_sell", usd_value: 30, wallet_label: "A" },
      { type: "exchange_deposit", usd_value: 1, wallet_label: null },
    ]);
    expect(s).toMatchObject({ buys: 2, buyUsd: 150, sells: 1, sellUsd: 30, deposits: 1, wallets: ["A", "B"] });
  });

  it("formatAnalysis bevat feiten en altijd de disclaimer, ook zonder AI", () => {
    const html = formatAnalysis(
      {
        chain: "sol", address: "BONK", symbol: "BONK", name: "Bonk", priceUsd: 0.0000234,
        liquidityUsd: 2_100_000, volume24hUsd: 5_000_000, priceChange24hPct: -3.21,
        marketCapUsd: 1.5e9, fdvUsd: null, pairUrl: null, source: "dexscreener",
      },
      emptyStats(),
      null,
      [],
    );
    expect(html).toContain("Bonk ($BONK)");
    expect(html).toContain("-3,2% 24u");
    expect(html).toContain("Geen activiteit van gevolgde wallets.");
    expect(html).not.toContain("Samenvatting");
    expect(html).toContain(DISCLAIMER);
  });

  it("DexScreener: kiest pair met hoogste liquiditeit en telt liquiditeit op", () => {
    const pair = (liq: number, price: string, base = "Tok") => ({
      chainId: "solana", url: `u${liq}`, baseToken: { address: base, symbol: "TOK" },
      quoteToken: { address: "So1", symbol: "SOL" }, priceUsd: price, liquidity: { usd: liq }, volume: { h24: 10 },
    });
    const info = pairsToInfo("sol", "Tok", [pair(5_000, "1.1"), pair(50_000, "1.0"), pair(999_999, "9", "Other")]);
    expect(info).toMatchObject({ priceUsd: 1, liquidityUsd: 55_000, volume24hUsd: 20, pairUrl: "u50000" });
  });
});

describe("summarize (Groq)", () => {
  const groqReply = (content: string, status = 200) =>
    vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status }));

  beforeEach(() => {
    process.env.GROQ_API_KEY = "gsk_test";
    delete process.env.ANTHROPIC_API_KEY;
  });
  afterEach(() => {
    delete process.env.GROQ_API_KEY;
  });

  it("stuurt system-prompt, lage temperature en Bearer-key naar Groq", async () => {
    const fetchImpl = groqReply("De liquiditeit is $2,1M.\\nDrie gevolgde wallets kochten.");
    const out = await summarize('{"x":1}', fetchImpl as unknown as typeof fetch);
    expect(out).toBe("De liquiditeit is $2,1M.\\nDrie gevolgde wallets kochten.");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer gsk_test");
    const body = JSON.parse(init.body as string);
    expect(body.temperature).toBe(0.2);
    expect(body.messages[0]).toMatchObject({ role: "system" });
    expect(body.messages[0].content).toContain("Geef NOOIT advies");
    expect(body.messages[1].content).toContain('{"x":1}');
  });

  it("advies in de output → null (alleen feiten tonen)", async () => {
    expect(await summarize("{}", groqReply("Koop nu, dit gaat stijgen!") as unknown as typeof fetch)).toBeNull();
  });

  it("fout van Groq → null, geen crash", async () => {
    expect(await summarize("{}", groqReply("", 429) as unknown as typeof fetch)).toBeNull();
  });

  it("zonder keys → null zonder netwerk-call", async () => {
    delete process.env.GROQ_API_KEY;
    const fetchImpl = groqReply("x");
    expect(await summarize("{}", fetchImpl as unknown as typeof fetch)).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
