import { normAddr, type Chain } from "@/lib/chain/types";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Houdt de adreslijsten van de Helius- en Alchemy-webhooks gelijk aan de
 * database. Zonder deze sync krijgen we geen events voor nieuwe wallets.
 */

const HELIUS = "https://api.helius.xyz/v0/webhooks";
const ALCHEMY = "https://dashboard.alchemy.com/api";

/** Adressen die een webhook moet volgen: actieve niet-exchange wallets + gevolgde tokens. */
export async function addressesToWatch(chain: Chain): Promise<string[]> {
  const db = supabaseAdmin();
  const [{ data: w, error: e1 }, { data: t, error: e2 }] = await Promise.all([
    db.from("wallets").select("address").eq("chain", chain).eq("active", true).neq("type", "exchange"),
    db.from("tokens_watch").select("address").eq("chain", chain),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  // Tokens alleen op Solana: daar triggert een mint-adres de webhook. Op ETH
  // vangt Address Activity geen transfers van een token-contract (zie README).
  const list = [...(w ?? []), ...(chain === "sol" ? (t ?? []) : [])].map((r) => normAddr(chain, r.address));
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

/** Volledige adreslijst van de Helius-webhook vervangen. */
export async function syncHelius(): Promise<{ ok: boolean; count: number; reason?: string }> {
  const key = process.env.HELIUS_API_KEY;
  const id = process.env.HELIUS_WEBHOOK_ID;
  const auth = process.env.HELIUS_WEBHOOK_AUTH;
  if (!key || !id || !auth) return { ok: false, count: 0, reason: "HELIUS_* env ontbreekt" };

  const addresses = await addressesToWatch("sol");
  const current = await fetch(`${HELIUS}/${id}?api-key=${key}`, { signal: AbortSignal.timeout(10_000) });
  if (!current.ok) return { ok: false, count: 0, reason: `GET webhook: ${current.status}` };
  const hook = (await current.json()) as { webhookURL: string };

  // Helius weigert een lege lijst; dan een dummy-adres dat nooit iets doet.
  const list = addresses.length ? addresses : ["11111111111111111111111111111111"];
  const res = await fetch(`${HELIUS}/${id}?api-key=${key}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(heliusWebhookBody(hook.webhookURL, list, auth)),
    signal: AbortSignal.timeout(10_000),
  });
  return res.ok
    ? { ok: true, count: addresses.length }
    : { ok: false, count: 0, reason: `PUT webhook: ${res.status} ${await res.text()}` };
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
