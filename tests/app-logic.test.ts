import { describe, expect, it } from "vitest";
import { parseWalletCsv } from "@/lib/csv";
import { matchWatchers } from "@/lib/alerts/user-alerts";
import { parseVisionAnswer } from "@/lib/analyse/vision";
import { feedQueryString, parseFeedParams } from "@/lib/feed-params";
import { exchangeFlowsByDay, tokenFlowsByDay, type FeedEvent } from "@/lib/data";
import { isActiveStatus } from "@/lib/stripe";
import { timeAgo, timeShort } from "@/lib/time";

describe("CSV-import van wallets", () => {
  it("parset geldige regels, normaliseert ETH en slaat header/commentaar over", () => {
    const { rows, errors } = parseWalletCsv(
      [
        "chain,address,label,type,entity",
        "# commentaar",
        "eth,0x28C6c06298d514Db089934071355E5743bf21d60,Binance 14,exchange,Binance",
        "sol,7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU,Fund A,smart_money",
        'sol,9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM,"Whale B"',
        "",
      ].join("\n"),
    );
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { chain: "eth", address: "0x28c6c06298d514db089934071355e5743bf21d60", label: "Binance 14", type: "exchange", entity: "Binance" },
      { chain: "sol", address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", label: "Fund A", type: "smart_money", entity: null },
      { chain: "sol", address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", label: "Whale B", type: "whale", entity: null },
    ]);
  });

  it("meldt fouten per regel", () => {
    const { rows, errors } = parseWalletCsv("btc,abc,x\neth,0x123,kapot\nsol,7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU,\neth,0x28c6c06298d514db089934071355e5743bf21d60,X,degen");
    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(4);
    expect(errors[0]).toContain("Row 1");
  });
});

describe("watchlist-matching voor DM-alerts", () => {
  const ev = { id: "e1", chain: "sol", wallet_address: "W1", token_address: "BONK", usd_value: "50000" };
  it("matcht op wallet en op token, respecteert drempel, één melding per gebruiker", () => {
    const m = matchWatchers([ev], [
      { user_id: "u1", kind: "wallet", chain: "sol", address: "W1", min_usd: 10000, label: "Mijn whale" },
      { user_id: "u1", kind: "token", chain: "sol", address: "BONK", min_usd: 1000, label: null },
      { user_id: "u2", kind: "wallet", chain: "sol", address: "W1", min_usd: "100000", label: null },
      { user_id: "u3", kind: "wallet", chain: "eth", address: "W1", min_usd: 0, label: null },
    ]);
    expect(m).toEqual([{ userId: "u1", eventId: "e1", label: "Mijn whale" }]);
  });
});

describe("screenshot-herkenning", () => {
  it("voorkeur voor een volledig contractadres, anders ticker", () => {
    expect(parseVisionAnswer('{"ticker":"BONK","contract":"DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263","chain":"solana"}')).toBe(
      "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    );
    expect(parseVisionAnswer('{"ticker":"$pepe","contract":"0x6982...1933"}')).toBe("pepe");
    expect(parseVisionAnswer('{"ticker":null,"contract":null}')).toBeNull();
    expect(parseVisionAnswer("geen json")).toBeNull();
    expect(parseVisionAnswer('{"ticker":"<script>"}')).toBeNull();
  });
});

describe("feed-filters", () => {
  it("valideert URL-parameters", () => {
    const f = parseFeedParams(new URLSearchParams("chain=eth&type=swap_buy&minUsd=250000&token=PEPE&limit=999&x=1"));
    expect(f).toMatchObject({ chain: "eth", type: "swap_buy", minUsd: 250000, token: "PEPE", limit: 200 });
    expect(parseFeedParams(new URLSearchParams("chain=btc&type=hack&minUsd=-5"))).toMatchObject({ chain: undefined, type: undefined, minUsd: undefined });
    expect(feedQueryString(f)).toBe("chain=eth&type=swap_buy&minUsd=250000&token=PEPE");
  });
});

describe("grafiek-data", () => {
  const today = new Date().toISOString();
  const e = (type: FeedEvent["type"], usd: number) => ({ type, usd_value: usd, created_at: today }) as FeedEvent;
  it("exchange-flows per dag: opname = in, storting = uit", () => {
    const d = exchangeFlowsByDay([e("exchange_withdrawal", 100), e("exchange_deposit", 40), e("swap_buy", 999)]);
    expect(d).toHaveLength(30);
    expect(d[29]).toMatchObject({ in: 100, out: 40 });
  });
  it("token-flows: kopen = in, verkopen = uit", () => {
    const d = tokenFlowsByDay([e("swap_buy", 10), e("swap_sell", 3)]);
    expect(d[13]).toMatchObject({ buy: 10, sell: 3 });
  });
});

describe("diversen", () => {
  it("Stripe-status → Pro", () => {
    expect(isActiveStatus("active")).toBe(true);
    expect(isActiveStatus("past_due")).toBe(true);
    expect(isActiveStatus("canceled")).toBe(false);
    expect(isActiveStatus("unpaid")).toBe(false);
  });
  it("relatieve tijd (Engels)", () => {
    const now = Date.parse("2026-11-23T10:00:00Z");
    expect(timeAgo("2026-11-23T09:59:50Z", now)).toBe("just now");
    expect(timeAgo("2026-11-23T09:55:00Z", now)).toMatch(/5 min/);
    expect(timeAgo("2026-11-23T07:00:00Z", now)).toMatch(/3 hr/);
    expect(timeShort("2026-11-23T07:00:00Z", now)).toBe("3h");
  });
});
