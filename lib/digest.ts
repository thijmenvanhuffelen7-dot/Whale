import { compact, formatUsd } from "@/lib/format";
import { DISCLAIMER, escapeHtml, shortAddress } from "@/lib/messages";
import { dexscreenerUrl, explorerTxUrl } from "@/lib/alerts/format";
import type { Chain } from "@/lib/chain/types";

export type DigestRow = {
  chain: Chain;
  tx_hash: string;
  type: string;
  token_address: string;
  token_symbol: string | null;
  amount: number | string;
  usd_value: number | string | null;
  wallet_address: string | null;
  wallet_label: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  swap_buy: "kocht",
  swap_sell: "verkocht",
  transfer: "verstuurde",
  exchange_deposit: "stortte naar exchange",
  exchange_withdrawal: "haalde van exchange",
};

/** Bouw het digest-bericht. Puur, zodat het makkelijk te testen is. */
export function buildDigest(rows: DigestRow[], dateLabel: string): string {
  const out = [`📊 <b>Dagelijkse digest — ${escapeHtml(dateLabel)}</b>`, ""];

  if (!rows.length) {
    out.push("Geen meldingswaardige activiteit in de afgelopen 24 uur.", "", `<i>${DISCLAIMER}</i>`);
    return out.join("\n");
  }

  const usd = (r: DigestRow) => Number(r.usd_value ?? 0);
  const who = (r: DigestRow) =>
    escapeHtml(r.wallet_label ?? (r.wallet_address ? shortAddress(r.wallet_address) : "?"));
  const sym = (r: DigestRow) => "$" + escapeHtml(r.token_symbol ?? "TOKEN");

  // 1. Grootste moves
  const top = [...rows].sort((a, b) => usd(b) - usd(a)).slice(0, 5);
  out.push("<b>🐋 Grootste moves</b>");
  top.forEach((r, i) => {
    out.push(
      `${i + 1}. ${who(r)} ${TYPE_LABEL[r.type] ?? r.type} ${compact(Number(r.amount))} ${sym(r)} (~${formatUsd(usd(r))}) · ${r.chain.toUpperCase()} · <a href="${explorerTxUrl(r.chain, r.tx_hash)}">tx</a>`,
    );
  });

  // 2. Meest actieve wallets
  const byWallet = new Map<string, { label: string; count: number; usd: number }>();
  for (const r of rows) {
    if (!r.wallet_address) continue;
    const k = `${r.chain}:${r.wallet_address}`;
    const w = byWallet.get(k) ?? { label: who(r), count: 0, usd: 0 };
    w.count++;
    w.usd += usd(r);
    byWallet.set(k, w);
  }
  const active = [...byWallet.values()].sort((a, b) => b.count - a.count || b.usd - a.usd).slice(0, 5);
  if (active.length) {
    out.push("", "<b>🔥 Meest actieve wallets</b>");
    for (const w of active) out.push(`• ${w.label}: ${w.count} tx (~${formatUsd(w.usd)})`);
  }

  // 3. Tokens waar meerdere gevolgde wallets in kochten
  const buys = new Map<string, { row: DigestRow; wallets: Set<string>; usd: number }>();
  for (const r of rows) {
    if (r.type !== "swap_buy" || !r.wallet_address) continue;
    const k = `${r.chain}:${r.token_address}`;
    const t = buys.get(k) ?? { row: r, wallets: new Set<string>(), usd: 0 };
    t.wallets.add(r.wallet_address);
    t.usd += usd(r);
    buys.set(k, t);
  }
  const shared = [...buys.values()].filter((t) => t.wallets.size >= 2).sort((a, b) => b.wallets.size - a.wallets.size);
  if (shared.length) {
    out.push("", "<b>🧠 Gekocht door meerdere gevolgde wallets</b>");
    for (const t of shared.slice(0, 5)) {
      out.push(
        `• <a href="${dexscreenerUrl(t.row.chain, t.row.token_address)}">${sym(t.row)}</a> (${t.row.chain.toUpperCase()}): ${t.wallets.size} wallets, ~${formatUsd(t.usd)}`,
      );
    }
  }

  out.push("", `<i>${DISCLAIMER}</i>`);
  return out.join("\n");
}

/** Lokale datum/uur in Amsterdam (Vercel Cron draait in UTC). */
export function amsterdamNow(d = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Amsterdam",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24 };
}

/** Begin van de huidige kalenderdag in Amsterdam, als UTC-Date. */
export function startOfAmsterdamDay(d = new Date()): Date {
  const { date } = amsterdamNow(d);
  // Probeer middernacht met +01:00 en +02:00 en kies degene die echt op die dag valt.
  for (const off of ["+01:00", "+02:00"]) {
    const c = new Date(`${date}T00:00:00${off}`);
    if (amsterdamNow(c).date === date && amsterdamNow(c).hour === 0) return c;
  }
  return new Date(`${date}T00:00:00+01:00`);
}
