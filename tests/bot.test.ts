import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBot, type BotDeps } from "@/lib/bot/index";
import { resetEnvCache } from "@/lib/env";
import { DISCLAIMER } from "@/lib/messages";
import { BOT_INFO, commandUpdate, interceptApi, makeDeps } from "./helpers/fake-telegram";
import helpInTopic from "@/fixtures/telegram/help-in-forum-topic.json";
import walletsInGroup from "@/fixtures/telegram/wallets-in-group.json";
import setupByMember from "@/fixtures/telegram/setup-by-member.json";

const TOKEN = "123456:TEST_TOKEN_NOT_REAL_xxxxxxxxxxxx";
const ADMIN = 111111111;
const MEMBER = 222222222;

function setup(deps: BotDeps = makeDeps(), members: Record<number, "creator" | "administrator" | "member"> = {}) {
  const bot = createBot(TOKEN, deps, { botInfo: BOT_INFO });
  const calls = interceptApi(bot, { [ADMIN]: "administrator", ...members });
  const sent = () => calls.filter((c) => c.method === "sendMessage").map((c) => c.payload.text as string);
  return { bot, deps, calls, sent };
}

beforeEach(() => {
  process.env.TELEGRAM_ADMIN_IDS = "";
  resetEnvCache();
});

describe("publieke commando's", () => {
  it("/help@bot in een forum topic antwoordt in hetzelfde topic met disclaimer", async () => {
    const { bot, calls } = setup(makeDeps(), { [ADMIN]: "member" });
    await bot.handleUpdate(helpInTopic as never);
    const send = calls.find((c) => c.method === "sendMessage")!;
    expect(send.payload.chat_id).toBe(-1001234567890);
    expect(send.payload.message_thread_id).toBe(7);
    expect(send.payload.parse_mode).toBe("HTML");
    expect(send.payload.text).toContain("/analyze");
    expect(send.payload.text).toContain(DISCLAIMER);
    expect(send.payload.text).not.toContain("/addwallet");
  });

  it("/help toont admin-commando's aan een groepsadmin", async () => {
    const { bot, sent } = setup();
    await bot.handleUpdate(helpInTopic as never);
    expect(sent()[0]).toContain("/addwallet");
  });

  it("/help toont admin-commando's aan een ID uit TELEGRAM_ADMIN_IDS zonder getChatMember", async () => {
    process.env.TELEGRAM_ADMIN_IDS = `5, ${ADMIN}`;
    resetEnvCache();
    const { bot, calls, sent } = setup();
    await bot.handleUpdate(helpInTopic as never);
    expect(calls.some((c) => c.method === "getChatMember")).toBe(false);
    expect(sent()[0]).toContain("/addwallet");
  });

  it("/wallets escapet labels en kort adressen in", async () => {
    const { bot, sent } = setup(
      makeDeps({
        listWallets: async () => [
          { chain: "eth", address: "0x1234567890abcdef1234567890abcdef12345678", label: "<b>Evil</b> & co", type: "smart_money" },
          { chain: "sol", address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", label: "Whale 1", type: "whale" },
        ],
      }),
    );
    await bot.handleUpdate(walletsInGroup as never);
    const text = sent()[0];
    expect(text).toContain("(2)");
    expect(text).toContain("&lt;b&gt;Evil&lt;/b&gt; &amp; co");
    expect(text).toContain("0x1234…5678");
    expect(text).toContain("9WzD…AWWM");
  });
});

describe("admin-commando's", () => {
  it("/setup door een gewoon lid wordt geweigerd", async () => {
    const { bot, deps, sent } = setup();
    await bot.handleUpdate(setupByMember as never);
    expect(deps.saveAlertTarget).not.toHaveBeenCalled();
    expect(sent()[0]).toContain("Only admins");
  });

  it("/setup zonder forum → hoofdchat", async () => {
    const { bot, deps } = setup();
    await bot.handleUpdate(commandUpdate("/setup", { userId: ADMIN }) as never);
    expect(deps.saveAlertTarget).toHaveBeenCalledWith(-1001234567890, null);
  });

  it("/setup in een forum maakt drie topics aan", async () => {
    const { bot, deps, calls } = setup();
    await bot.handleUpdate(commandUpdate("/setup", { userId: ADMIN, forum: true }) as never);
    const topics = calls.filter((c) => c.method === "createForumTopic").map((c) => c.payload.name);
    expect(topics).toEqual(["🐋 ETH", "🐋 SOL", "📊 Digest"]);
    const [, saved] = (deps.saveAlertTarget as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(saved).toEqual({ eth: expect.any(Number), sol: expect.any(Number), digest: expect.any(Number) });
  });

  it("/addwallet valideert en normaliseert", async () => {
    const { bot, deps, sent } = setup();
    await bot.handleUpdate(commandUpdate("/addwallet eth 0xABCDEF0123456789abcdef0123456789ABCDEF01 Fund A cold smart_money", { userId: ADMIN }) as never);
    expect(deps.addWallet).toHaveBeenCalledWith("eth", "0xabcdef0123456789abcdef0123456789abcdef01", "Fund A cold", "smart_money");
    expect(sent()[0]).toContain("Fund A cold");

    await bot.handleUpdate(commandUpdate("/addwallet eth 0x123 Kapot", { userId: ADMIN }) as never);
    expect(sent()[1]).toContain("not a valid ETH address");
    await bot.handleUpdate(commandUpdate("/addwallet btc 0x123 x", { userId: ADMIN }) as never);
    expect(sent()[2]).toContain("eth</code> or <code>sol");
    await bot.handleUpdate(commandUpdate("/addwallet sol 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", { userId: ADMIN }) as never);
    expect(sent()[3]).toContain("Usage:");
    expect(deps.addWallet).toHaveBeenCalledTimes(1);
  });

  it("/addwallet meldt het als de webhook-sync mislukt", async () => {
    const { bot, sent } = setup(makeDeps({ addWallet: async () => ({ existed: false, synced: false, reason: "HELIUS_* env ontbreekt" }) }));
    await bot.handleUpdate(commandUpdate("/addwallet sol 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM Whale", { userId: ADMIN }) as never);
    expect(sent()[0]).toContain("Not registered with the webhook yet: HELIUS_* env ontbreekt");
  });

  it("/threshold accepteert 250k / 250.000 en weigert onzin", async () => {
    const { bot, deps, sent } = setup();
    await bot.handleUpdate(commandUpdate("/threshold 250k", { userId: ADMIN }) as never);
    await bot.handleUpdate(commandUpdate("/threshold 500.000", { userId: ADMIN }) as never);
    await bot.handleUpdate(commandUpdate("/threshold abc", { userId: ADMIN }) as never);
    expect(deps.setThreshold).toHaveBeenNthCalledWith(1, 250_000);
    expect(deps.setThreshold).toHaveBeenNthCalledWith(2, 500_000);
    expect(deps.setThreshold).toHaveBeenCalledTimes(2);
    expect(sent()[0]).toContain("$250,000");
    expect(sent()[2]).toContain("Usage:");
  });

  it("/pause en /resume, maar niet voor leden", async () => {
    const { bot, deps } = setup();
    await bot.handleUpdate(commandUpdate("/pause", { userId: MEMBER }) as never);
    expect(deps.setPaused).not.toHaveBeenCalled();
    await bot.handleUpdate(commandUpdate("/pause", { userId: ADMIN }) as never);
    await bot.handleUpdate(commandUpdate("/resume", { userId: ADMIN }) as never);
    expect(deps.setPaused).toHaveBeenNthCalledWith(1, true);
    expect(deps.setPaused).toHaveBeenNthCalledWith(2, false);
  });
});

describe("/analyse", () => {
  it("stuurt eerst 'bezig', bewerkt daarna het bericht met het resultaat en logt", async () => {
    const tasks: Promise<unknown>[] = [];
    const deps = makeDeps({ background: (t) => void tasks.push(t()) });
    const { bot, calls } = setup(deps);
    await bot.handleUpdate(commandUpdate("/analyse pepe", { userId: MEMBER }) as never);
    await Promise.all(tasks);
    expect(calls.find((c) => c.method === "sendMessage")!.payload.text).toContain("Analyzing <b>pepe</b>");
    const edit = calls.find((c) => c.method === "editMessageText")!;
    expect(edit.payload.text).toBe("<b>analyse</b>");
    expect(deps.analyse.run).toHaveBeenCalledWith("pepe");
    expect(deps.analyse.log).toHaveBeenCalledWith(MEMBER, "pepe");
  });

  it("respecteert de daglimiet voor leden", async () => {
    const deps = makeDeps();
    deps.analyse.usage = vi.fn(async () => ({ used: 5, limit: 5 }));
    const { bot, sent } = setup(deps);
    await bot.handleUpdate(commandUpdate("/analyse pepe", { userId: MEMBER }) as never);
    expect(sent()[0]).toContain("used your 5 analyses");
    expect(deps.analyse.run).not.toHaveBeenCalled();
  });

  it("admins hebben geen limiet", async () => {
    const deps = makeDeps();
    deps.analyse.usage = vi.fn(async () => ({ used: 99, limit: 5 }));
    const { bot } = setup(deps);
    await bot.handleUpdate(commandUpdate("/analyse pepe", { userId: ADMIN }) as never);
    expect(deps.analyse.run).toHaveBeenCalled();
  });

  it("niet gevonden → nette melding, niet gelogd", async () => {
    const tasks: Promise<unknown>[] = [];
    const deps = makeDeps({ background: (t) => void tasks.push(t()) });
    deps.analyse.run = vi.fn(async () => null);
    const { bot, calls } = setup(deps);
    await bot.handleUpdate(commandUpdate("/analyse <xx>", { userId: MEMBER }) as never);
    await Promise.all(tasks);
    expect(calls.find((c) => c.method === "editMessageText")!.payload.text).toContain("No token found for <b>&lt;xx&gt;</b>");
    expect(deps.analyse.log).not.toHaveBeenCalled();
  });

  it("zonder argument → uitleg", async () => {
    const { bot, sent } = setup();
    await bot.handleUpdate(commandUpdate("/analyze", { userId: MEMBER }) as never);
    expect(sent()[0]).toContain("Usage:");
  });
});

describe("/start <code> (account koppelen)", () => {
  const privateStart = (text: string) => ({
    update_id: 1,
    message: {
      message_id: 1,
      from: { id: 555, is_bot: false, first_name: "A", username: "anna" },
      chat: { id: 555, type: "private", first_name: "A" },
      date: 1763884800,
      text,
      entities: [{ offset: 0, length: 6, type: "bot_command" }],
    },
  });

  it("koppelt met een geldige code en meldt Pro", async () => {
    const linkAccount = vi.fn(async () => "ok_pro" as const);
    const { bot, sent } = setup(makeDeps({ linkAccount }));
    await bot.handleUpdate(privateStart("/start a1b2c3d4e5f6a7b8c9") as never);
    expect(linkAccount).toHaveBeenCalledWith("a1b2c3d4e5f6a7b8c9", { id: 555, username: "anna" });
    expect(sent()[0]).toContain("linked");
    expect(sent()[0]).toContain("Pro group");
  });

  it("weigert rare codes zonder database-call, en meldt een bezette koppeling", async () => {
    const linkAccount = vi.fn(async () => "taken" as const);
    const { bot, sent } = setup(makeDeps({ linkAccount }));
    await bot.handleUpdate(privateStart("/start ../../etc") as never);
    expect(linkAccount).not.toHaveBeenCalled();
    expect(sent()[0]).toContain("doesn't work");
    await bot.handleUpdate(privateStart("/start a1b2c3d4e5f6a7b8c9") as never);
    expect(sent()[1]).toContain("already linked to another");
  });

  it("zonder code: gewone welkom", async () => {
    const { bot, sent } = setup();
    await bot.handleUpdate(privateStart("/start") as never);
    expect(sent()[0]).toContain("Welcome");
  });
});

describe("/setup met kapotte database", () => {
  it("maakt geen topics aan als de database niet bereikbaar is", async () => {
    const deps = makeDeps({ checkDb: async () => false });
    const bot = createBot(TOKEN, deps, { botInfo: BOT_INFO });
    const calls = interceptApi(bot, { [ADMIN]: "administrator" });
    await bot.handleUpdate(commandUpdate("/setup", { userId: ADMIN, forum: true }) as never);
    expect(calls.some((c) => c.method === "createForumTopic")).toBe(false);
    expect(deps.saveAlertTarget).not.toHaveBeenCalled();
    expect(calls.find((c) => c.method === "sendMessage")!.payload.text).toContain("database isn't connected");
  });
});

describe("admin-herkenning", () => {
  it("leest TELEGRAM_ADMIN_IDS tolerant (spaties, quotes)", async () => {
    process.env.TELEGRAM_ADMIN_IDS = ' "111111111" ; 5 ';
    resetEnvCache();
    const { bot, sent } = setup(makeDeps(), { [ADMIN]: "member" });
    await bot.handleUpdate(helpInTopic as never);
    expect(sent()[0]).toContain("/addwallet");
  });

  it("toont je eigen ID in een privéchat als je geen admin bent", async () => {
    const { bot, sent } = setup();
    await bot.handleUpdate({
      update_id: 9,
      message: {
        message_id: 1, from: { id: 777, is_bot: false, first_name: "X" }, chat: { id: 777, type: "private", first_name: "X" },
        date: 1, text: "/pause", entities: [{ offset: 0, length: 6, type: "bot_command" }],
      },
    } as never);
    expect(sent()[0]).toContain("Your Telegram ID: <code>777</code>");
  });
});
