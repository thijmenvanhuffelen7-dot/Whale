import { type Api, GrammyError, HttpError } from "grammy";

type SendOpts = { threadId?: number | null; disablePreview?: boolean };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * sendMessage met retry: bij 429 wachten we `retry_after`, bij 5xx/netwerk
 * exponentiële backoff. Gooit pas na de laatste poging.
 * Topic bestaat niet meer → nog één keer zonder topic proberen.
 */
export async function sendWithRetry(
  api: Api,
  chatId: number | string,
  html: string,
  opts: SendOpts = {},
  { maxAttempts = 4, baseDelayMs = 1000, maxWaitMs = 20_000, sleepFn = sleep } = {},
) {
  let threadId = opts.threadId ?? undefined;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await api.sendMessage(chatId, html, {
        parse_mode: "HTML",
        message_thread_id: threadId,
        link_preview_options: { is_disabled: opts.disablePreview ?? true },
      });
    } catch (err) {
      lastErr = err;
      if (err instanceof GrammyError) {
        if (err.error_code === 429) {
          const wait = (err.parameters.retry_after ?? 1) * 1000;
          if (wait > maxWaitMs) throw err;
          await sleepFn(wait);
          continue;
        }
        if (err.error_code === 400 && threadId && /thread not found|topic/i.test(err.description)) {
          threadId = undefined;
          continue;
        }
        if (err.error_code >= 500) {
          await sleepFn(baseDelayMs * 2 ** (attempt - 1));
          continue;
        }
        throw err; // 400/403: opnieuw proberen helpt niet
      }
      if (err instanceof HttpError) {
        await sleepFn(baseDelayMs * 2 ** (attempt - 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
