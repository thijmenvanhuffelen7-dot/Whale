"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAllSettings, setSetting, type Settings } from "@/lib/settings";
import { parseWalletCsv, type WalletInput } from "@/lib/csv";
import { syncHelius, updateAlchemy } from "@/lib/providers";
import { getBot } from "@/lib/bot/instance";
import { sendWithRetry } from "@/lib/telegram/send";
import { formatAlert } from "@/lib/alerts/format";

export type AdminState = { ok?: boolean; error?: string; message?: string } | null;

async function syncProviders(changed: WalletInput[]) {
  const eth = changed.filter((w) => w.chain === "eth" && w.type !== "exchange").map((w) => w.address);
  const results: string[] = [];
  if (changed.some((w) => w.chain === "sol")) {
    const r = await syncHelius();
    if (!r.ok) results.push(`Helius: ${r.reason}`);
  }
  if (eth.length) {
    const r = await updateAlchemy(eth, []);
    if (!r.ok) results.push(`Alchemy: ${r.reason}`);
  }
  return results;
}

export async function importWallets(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const file = form.get("file");
  const text = file instanceof File && file.size ? await file.text() : String(form.get("csv") ?? "");
  const { rows, errors } = parseWalletCsv(text);
  if (!rows.length) return { error: errors[0] ?? "No valid rows found." };
  const { error } = await supabaseAdmin()
    .from("wallets")
    .upsert(rows.map((r) => ({ ...r, active: true })), { onConflict: "chain,address" });
  if (error) return { error: `Saving failed: ${error.message}` };
  const syncErrors = await syncProviders(rows);
  revalidatePath("/admin/wallets");
  return {
    ok: true,
    message:
      `${rows.length} wallet(s) saved.` +
      (errors.length ? ` ${errors.length} row(s) skipped: ${errors.slice(0, 3).join("; ")}` : "") +
      (syncErrors.length ? ` Note: ${syncErrors.join("; ")}` : ""),
  };
}

export async function toggleWallet(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const active = form.get("active") === "true";
  const { data } = await supabaseAdmin().from("wallets").update({ active }).eq("id", id).select("chain, address, label, type, entity").single();
  if (data?.chain === "sol") await syncHelius();
  if (data?.chain === "eth" && data.type !== "exchange") await updateAlchemy(active ? [data.address] : [], active ? [] : [data.address]);
  revalidatePath("/admin/wallets");
}

export async function deleteWallet(form: FormData) {
  await requireAdmin();
  const { data } = await supabaseAdmin().from("wallets").delete().eq("id", String(form.get("id"))).select("chain, address, type").single();
  if (data?.chain === "sol") await syncHelius();
  if (data?.chain === "eth" && data.type !== "exchange") await updateAlchemy([], [data.address]);
  revalidatePath("/admin/wallets");
}

const NUMERIC: (keyof Settings)[] = ["alert_threshold_usd", "swap_threshold_usd", "min_liquidity_usd", "throttle_seconds", "analyse_daily_limit"];

export async function saveSettings(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  for (const k of NUMERIC) {
    const v = Number(String(form.get(k) ?? "").replace(/[^\d.]/g, ""));
    if (!Number.isFinite(v) || v < 0) return { error: `Invalid value for ${k}` };
    await setSetting(k, v as never);
  }
  await setSetting("alerts_paused", form.get("alerts_paused") === "on");
  revalidatePath("/admin/settings");
  return { ok: true, message: "Settings saved." };
}

/** Testalert naar de groep (ETH-topic), om de koppeling te controleren. */
export async function sendTestAlert(): Promise<AdminState> {
  await requireAdmin();
  const s = await getAllSettings();
  const chatId = s.chat_id ?? (process.env.TELEGRAM_CHAT_ID ? Number(process.env.TELEGRAM_CHAT_ID) : null);
  if (!chatId) return { error: "No chat set up. Type /setup in your group." };
  const html =
    "🧪 <b>Test alert</b>\n\n" +
    formatAlert({ address: "0x28c6c06298d514db089934071355e5743bf21d60", label: "Example (test)", type: "whale" }, [
      {
        chain: "eth", txHash: "0x0", type: "exchange_deposit", tokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        tokenSymbol: "ETH", amount: 1, usdValue: null, counterparty: null, counterpartyLabel: "Binance", quoteSymbol: null, quoteAmount: null,
      },
    ]);
  try {
    await sendWithRetry(getBot().api, chatId, html, { threadId: s.topic_eth });
    return { ok: true, message: "Sent. Check your group." };
  } catch (e) {
    return { error: `Sending failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}
