import { describe, expect, it, vi } from "vitest";
import { GrammyError, type Api } from "grammy";
import { sendWithRetry } from "@/lib/telegram/send";

function tgError(code: number, description: string, retry_after?: number) {
  return new GrammyError(
    "fail",
    { ok: false, error_code: code, description, parameters: retry_after ? { retry_after } : {} },
    "sendMessage",
    {},
  );
}

function fakeApi(results: (Error | "ok")[]) {
  const calls: Record<string, unknown>[] = [];
  const api = {
    sendMessage: vi.fn(async (_chat: number, _text: string, opts: Record<string, unknown>) => {
      calls.push(opts);
      const r = results.shift();
      if (r instanceof Error) throw r;
      return { message_id: 1 };
    }),
  } as unknown as Api;
  return { api, calls };
}

const noSleep = { sleepFn: vi.fn(async () => {}) };

describe("sendWithRetry", () => {
  it("wacht retry_after bij 429 en probeert opnieuw", async () => {
    const { api } = fakeApi([tgError(429, "Too Many Requests", 3), "ok"]);
    const sleepFn = vi.fn(async () => {});
    await sendWithRetry(api, -100, "hi", {}, { sleepFn });
    expect(sleepFn).toHaveBeenCalledWith(3000);
    expect(api.sendMessage).toHaveBeenCalledTimes(2);
  });

  it("backoff bij 5xx, gooit na max pogingen", async () => {
    const { api } = fakeApi([tgError(502, "Bad Gateway"), tgError(502, "x"), tgError(502, "x"), tgError(502, "x")]);
    await expect(sendWithRetry(api, -100, "hi", {}, noSleep)).rejects.toBeInstanceOf(GrammyError);
    expect(api.sendMessage).toHaveBeenCalledTimes(4);
  });

  it("geen retry bij 400 (bv. fout in HTML)", async () => {
    const { api } = fakeApi([tgError(400, "Bad Request: can't parse entities")]);
    await expect(sendWithRetry(api, -100, "<b>", {}, noSleep)).rejects.toThrow();
    expect(api.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("valt terug op de hoofdchat als het topic niet meer bestaat", async () => {
    const { api, calls } = fakeApi([tgError(400, "Bad Request: message thread not found"), "ok"]);
    await sendWithRetry(api, -100, "hi", { threadId: 7 }, noSleep);
    expect(calls[0].message_thread_id).toBe(7);
    expect(calls[1].message_thread_id).toBeUndefined();
  });
});
