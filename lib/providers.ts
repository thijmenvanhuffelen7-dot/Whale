import { normAddr, type Chain } from "@/lib/chain/types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SITE } from "@/lib/site";

/**
 * Houdt de adreslijsten van de Helius- en Alchemy-webhooks gelijk aan de
 * database. Zonder deze sync krijgen we geen events voor nieuwe wallets.
 */

const HELIUS = "https://api.helius.xyz/v0/webhooks";
const ALCHEMY = "https://dashboard.alchemy.com/api";

/** Adressen die een webhook moet volgen: actieve niet-exchange wallets + gevolgde tokens. */
export async function addressesToWatch(chain: Chain): Promise<string[]> {
  const db = supabaseAdmin();
  const [{ data: w, error: e1 }, { data: t, error: e2 }, { data: u }] = await Promise.all([
    db.from("wallets").select("address").eq("chain", chain).eq("active", true).neq("type", "exchange"),
    db.from("tokens_watch").select("address").eq("chain", chain),
    // Watchlists van gebruikers (tabel bestaat pas na migratie 3)
    db.from("watchlist").select("address, kind").eq("chain", chain),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const userWallets = (u ?? []).filter((r) => r.kind === "wallet");
  const userTokens = (u ?? []).filter((r) => r.kind === "token");
  // Tokens alleen op Solana: daar triggert een mint-adres de webhook. Op ETH
  // vangt Address Activity geen transfers van een token-contract (zie README).
  const list = [...(w ?? []), ...userWallets, ...(chain === "sol" ? [...(t ?? []), ...userTokens] : [])].map((r) =>
    normAddr(chain, r.address),
  );
  return [...new Set(list)];
}

export function heliusWebhookBody(webhookURL: string, addresses: string[], authHeader: string) {
  return {
    webhookURL,
    transactionTypes: ["ANY"],
    accountAddresses: addresses,
    webhookType: "enhanced",
    authHeader,
  };
}

/** Geheim dat Helius meestuurt; valt terug op het Telegram-geheim zodat je maar één ding hoeft in te stellen. */
export function heliusAuth(): string | undefined {
  return process.env.HELIUS_WEBHOOK_AUTH || process.env.TELEGRAM_WEBHOOK_SECRET || undefined;
}

export function heliusWebhookUrl(): string {
  return `${SITE.url.replace(/\/$/, "")}/api/webhooks/helius`;
}

type HeliusHook = { webhookID: string; webhookURL: string };

/**
 * Volledige adreslijst van de Helius-webhook vervangen. Bestaat er nog geen
 * webhook (geen HELIUS_WEBHOOK_ID en geen hook met onze URL), dan maken we
 * hem aan. Zo hoef je alleen HELIUS_API_KEY in te stellen.
 */
export async function syncHelius(): Promise<{ ok: boolean; count: number; reason?: string }> {
  const key = process.env.HELIUS_API_KEY;
  const auth = heliusAuth();
  if (!key || !auth) return { ok: false, count: 0, reason: "HELIUS_API_KEY ontbreekt in Vercel" };
  if (SITE.url.includes("localhost")) return { ok: false, count: 0, reason: "geen publiek adres (NEXT_PUBLIC_SITE_URL)" };

  const addresses = await addressesToWatch("sol");
  // Helius weigert een lege lijst; dan een dummy-adres dat nooit iets doet.
  const list = addresses.length ? addresses : ["11111111111111111111111111111111"];
  const url = heliusWebhookUrl();
  const body = JSON.stringify(heliusWebhookBody(url, list, auth));
  const headers = { "content-type": "application/json" };

  let id = process.env.HELIUS_WEBHOOK_ID;
  if (!id) {
    const all = await fetch(`${HELIUS}?api-key=${key}`, { signal: AbortSignal.timeout(10_000) });
    if (!all.ok) return { ok: false, count: 0, reason: `Helius: ${all.status} (klopt HELIUS_API_KEY?)` };
    const hooks = (await all.json()) as HeliusHook[];
    id = hooks.find((h) => h.webhookURL === url)?.webhookID;
  }

  const res = id
    ? await fetch(`${HELIUS}/${id}?api-key=${key}`, { method: "PUT", headers, body, signal: AbortSignal.timeout(10_000) })
    : await fetch(`${HELIUS}?api-key=${key}`, { method: "POST", headers, body, signal: AbortSignal.timeout(10_000) });
  return res.ok
    ? { ok: true, count: addresses.length }
    : { ok: false, count: 0, reason: `Helius ${id ? "update" : "aanmaken"}: ${res.status} ${(await res.text()).slice(0, 200)}` };
}

/** Adressen toevoegen/verwijderen bij de Alchemy Address Activity webhook. */
export async function updateAlchemy(add: string[], remove: string[]) {
  const token = process.env.ALCHEMY_AUTH_TOKEN;
  const id = process.env.ALCHEMY_WEBHOOK_ID;
  if (!token || !id) return { ok: false, reason: "ALCHEMY_AUTH_TOKEN/ALCHEMY_WEBHOOK_ID ontbreekt" };
  const res = await fetch(`${ALCHEMY}/update-webhook-addresses`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "X-Alchemy-Token": token },
    body: JSON.stringify({ webhook_id: id, addresses_to_add: add, addresses_to_remove: remove }),
    signal: AbortSignal.timeout(10_000),
  });
  return res.ok ? { ok: true } : { ok: false, reason: `${res.status} ${await res.text()}` };
}

/** Na een wijziging aan wallets: juiste provider bijwerken. */
export async function syncWalletChange(chain: Chain, change: { add?: string; remove?: string }) {
  if (chain === "sol") return syncHelius();
  return updateAlchemy(change.add ? [change.add] : [], change.remove ? [change.remove] : []);
}
