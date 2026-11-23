import { beforeAll, describe, expect, it, vi } from "vitest";
import { createBot } from "@/lib/bot/index";
import { BOT_INFO, interceptApi, makeDeps, type ApiCall } from "./helpers/fake-telegram";
import helpInTopic from "@/fixtures/telegram/help-in-forum-topic.json";

const SECRET = "test_secret_0123456789abcdef";
let calls: ApiCall[] = [];

vi.mock("@/lib/bot/instance", () => {
  const bot = createBot(
    "123456:TEST_TOKEN_NOT_REAL_xxxxxxxxxxxx",
    makeDeps(),
    { botInfo: BOT_INFO },
  );
  return { getBot: () => bot, __bot: bot };
});

beforeAll(async () => {
  process.env.TELEGRAM_WEBHOOK_SECRET = SECRET;
  const mod = (await import("@/lib/bot/instance")) as unknown as { __bot: Parameters<typeof interceptApi>[0] };
  calls = interceptApi(mod.__bot);
});

function req(secret?: string) {
  return new Request("http://localhost/api/telegram", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(secret ? { "x-telegram-bot-api-secret-token": secret } : {}),
    },
    body: JSON.stringify(helpInTopic),
  });
}

describe("POST /api/telegram", () => {
  it("weigert een request zonder of met fout secret token", async () => {
    const { POST } = await import("@/app/api/telegram/route");
    expect((await POST(req())).status).toBe(401);
    expect((await POST(req("wrong_secret_xxxxxxxxxxxx"))).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("verwerkt een update met het juiste secret token", async () => {
    const { POST } = await import("@/app/api/telegram/route");
    const res = await POST(req(SECRET));
    expect(res.status).toBe(200);
    expect(calls.some((c) => c.method === "sendMessage")).toBe(true);
  });
});
