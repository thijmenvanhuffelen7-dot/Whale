import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBot, type BotDeps } from "@/lib/bot/index";
import { resetEnvCache } from "@/lib/env";
import { DISCLAIMER } from "@/lib/messages";
import { BOT_INFO, interceptApi } from "./helpers/fake-telegram";
import helpInTopic from "@/fixtures/telegram/help-in-forum-topic.json";
import walletsInGroup from "@/fixtures/telegram/wallets-in-group.json";
import setupByMember from "@/fixtures/telegram/setup-by-member.json";

const TOKEN = "123456:TEST_TOKEN_NOT_REAL_xxxxxxxxxxxx";

function makeDeps(overrides: Partial<BotDeps> = {}): BotDeps {
  return {
    listWallets: vi.fn(async () => []),
    saveAlertTarget: vi.fn(async () => {}),
    ...overrides,
  };
}

beforeEach(() => {
  process.env.TELEGRAM_ADMIN_IDS = "";
  resetEnvCache();
});

describe("bot commands", () => {
  it("/help@bot in een forum topic antwoordt in hetzelfde topic met disclaimer", async () => {
    const bot = createBot(TOKEN, makeDeps(), { botInfo: BOT_INFO });
    const calls = interceptApi(bot);
    await bot.handleUpdate(helpInTopic as never);

    const send = calls.find((c) => c.method === "sendMessage");
    expect(send).toBeDefined();
    expect(send!.payload.chat_id).toBe(-1001234567890);
    expect(send!.payload.message_thread_id).toBe(7);
    expect(send!.payload.parse_mode).toBe("HTML");
    expect(send!.payload.text).toContain("/analyse");
    expect(send!.payload.text).toContain(DISCLAIMER);
    // Gewoon lid → geen admin-commando's in de help.
    expect(send!.payload.text).not.toContain("/addwallet");
  });

  it("/help toont admin-commando's aan een groepsadmin", async () => {
    const bot = createBot(TOKEN, makeDeps(), { botInfo: BOT_INFO });
    const calls = interceptApi(bot, { 111111111: "administrator" });
    await bot.handleUpdate(helpInTopic as never);
    const send = calls.find((c) => c.method === "sendMessage")!;
    expect(send.payload.text).toContain("/addwallet");
  });

  it("/help toont admin-commando's aan een ID uit TELEGRAM_ADMIN_IDS", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "5, 111111111";
    resetEnvCache();
    const bot = createBot(TOKEN, makeDeps(), { botInfo: BOT_INFO });
    const calls = interceptApi(bot);
    await bot.handleUpdate(helpInTopic as never);
    expect(calls.some((c) => c.method === "getChatMember")).toBe(false);
    expect(calls.find((c) => c.method === "sendMessage")!.payload.text).toContain("/addwallet");
  });

  it("/wallets escapet labels en kort adressen in", async () => {
    const deps = makeDeps({
      listWallets: async () => [
        { chain: "eth", address: "0x1234567890abcdef1234567890abcdef12345678", label: "<b>Evil</b> & co", type: "smart_money" },
        { chain: "sol", address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", label: "Whale 1", type: "whale" },
      ],
    });
    const bot = createBot(TOKEN, deps, { botInfo: BOT_INFO });
    const calls = interceptApi(bot);
    await bot.handleUpdate(walletsInGroup as never);
    const text = calls.find((c) => c.method === "sendMessage")!.payload.text as string;
    expect(text).toContain("(2)");
    expect(text).toContain("&lt;b&gt;Evil&lt;/b&gt; &amp; co");
    expect(text).toContain("0x1234…5678");
    expect(text).toContain("9WzD…AWWM");
    expect(text).not.toContain("<b>Evil</b>");
  });

  it("/wallets zonder wallets geeft een nette melding", async () => {
    const bot = createBot(TOKEN, makeDeps(), { botInfo: BOT_INFO });
    const calls = interceptApi(bot);
    await bot.handleUpdate(walletsInGroup as never);
    expect(calls.find((c) => c.method === "sendMessage")!.payload.text).toContain("nog geen wallets");
  });

  it("/setup door een gewoon lid wordt geweigerd en slaat niets op", async () => {
    const deps = makeDeps();
    const bot = createBot(TOKEN, deps, { botInfo: BOT_INFO });
    const calls = interceptApi(bot);
    await bot.handleUpdate(setupByMember as never);
    expect(deps.saveAlertTarget).not.toHaveBeenCalled();
    expect(calls.find((c) => c.method === "sendMessage")!.payload.text).toContain("Alleen admins");
  });

  it("/setup door een admin slaat de chat op", async () => {
    const deps = makeDeps();
    const bot = createBot(TOKEN, deps, { botInfo: BOT_INFO });
    interceptApi(bot, { 222222222: "creator" });
    await bot.handleUpdate(setupByMember as never);
    expect(deps.saveAlertTarget).toHaveBeenCalledWith(-1001234567890, undefined);
  });
});
