import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.TELEGRAM_BOT_TOKEN = "123456:TEST_TOKEN_NOT_REAL_xxxxxxxxxxxx";
  process.env.TELEGRAM_WEBHOOK_SECRET = "setup_secret_0123456789";
});

describe("GET /api/setup", () => {
  it("weigert zonder of met verkeerde key, zonder Telegram aan te roepen", async () => {
    const { GET } = await import("@/app/api/setup/route");
    expect((await GET(new Request("https://x.vercel.app/api/setup"))).status).toBe(401);
    expect((await GET(new Request("https://x.vercel.app/api/setup?key=fout"))).status).toBe(401);
  });
});
