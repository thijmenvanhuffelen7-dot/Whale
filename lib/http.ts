import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";

/** Constant-time vergelijking van secrets. */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Vercel Cron stuurt `Authorization: Bearer $CRON_SECRET`. */
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return safeEqual(req.headers.get("authorization"), secret ? `Bearer ${secret}` : null);
}

/**
 * Werk na het antwoord doen (Vercel houdt de functie in leven). Buiten een
 * request (bv. het polling-script) gewoon direct starten.
 */
export function runInBackground(task: () => Promise<unknown>) {
  const safe = () =>
    task().catch((e) => {
      console.error("[background] fout", e);
    });
  try {
    after(safe);
  } catch {
    void safe();
  }
}
