import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import heliusSwap from "@/fixtures/helius/swap-buy-bonk.json";
import alchemySwap from "@/fixtures/alchemy/swap-sell-pepe.json";

const handleChainWebhook = vi.fn(async (_chain: string, parse: (t: Set<string>, w: Set<string>) => unknown[]) => {
  const events = parse(new Set(["7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", "0xabcdef0123456789abcdef0123456789abcdef01"]), new Set());
  return { inserted: events.length, alertable: 0 };
});

vi.mock("@/lib/alerts/pipeline", () => ({
  handleChainWebhook: (...a: Parameters<typeof handleChainWebhook>) => handleChainWebhook(...a),
  dispatchPending: vi.fn(),
  logWebhookFailure: vi.fn(),
}));
vi.mock("@/lib/bot/instance", () => ({ getBot: () => ({ api: {} }) }));
vi.mock("@/lib/alerts/user-alerts", () => ({ dispatchUserAlerts: vi.fn() }));

beforeAll(() => {
  process.env.HELIUS_WEBHOOK_AUTH = "helius_auth_secret_123456";
  process.env.ALCHEMY_WEBHOOK_SIGNING_KEY = "whsec_test_key";
});
beforeEach(() => {
  handleChainWebhook.mockClear();
});

describe("POST /api/webhooks/helius", () => {
  const req = (auth?: string, body: unknown = heliusSwap) =>
    new Request("http://x/api/webhooks/helius", {
      method: "POST",
      headers: { "content-type": "application/json", ...(auth ? { authorization: auth } : {}) },
      body: JSON.stringify(body),
    });

  it("weigert zonder of met verkeerde auth header", async () => {
    const { POST } = await import("@/app/api/webhooks/helius/route");
    expect((await POST(req())).status).toBe(401);
    expect((await POST(req("wrong"))).status).toBe(401);
    expect(handleChainWebhook).not.toHaveBeenCalled();
  });

  it("verwerkt een geldige payload", async () => {
    const { POST } = await import("@/app/api/webhooks/helius/route");
    const res = await POST(req("helius_auth_secret_123456"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, inserted: 1 });
  });

  it("ongeldige payload → 500 en gelogd (Helius probeert later opnieuw)", async () => {
    const { POST } = await import("@/app/api/webhooks/helius/route");
    const res = await POST(req("helius_auth_secret_123456", { not: "an array" }));
    expect(res.status).toBe(500);
  });
});

describe("POST /api/webhooks/alchemy", () => {
  const body = JSON.stringify(alchemySwap);
  const sign = (b: string, key = "whsec_test_key") => createHmac("sha256", key).update(b).digest("hex");
  const req = (sig?: string, b = body) =>
    new Request("http://x/api/webhooks/alchemy", {
      method: "POST",
      headers: { "content-type": "application/json", ...(sig ? { "x-alchemy-signature": sig } : {}) },
      body: b,
    });

  it("weigert zonder, met verkeerde of voor een andere body berekende signature", async () => {
    const { POST } = await import("@/app/api/webhooks/alchemy/route");
    expect((await POST(req())).status).toBe(401);
    expect((await POST(req(sign(body, "other")))).status).toBe(401);
    expect((await POST(req(sign(body), body.replace("PEPE", "PEPF")))).status).toBe(401);
    expect(handleChainWebhook).not.toHaveBeenCalled();
  });

  it("verwerkt een correct gesigneerde payload", async () => {
    const { POST } = await import("@/app/api/webhooks/alchemy/route");
    const res = await POST(req(sign(body)));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, inserted: 1 });
  });
});
