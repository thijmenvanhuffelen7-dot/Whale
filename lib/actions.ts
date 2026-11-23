"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfile, planOf } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isEthAddress, isSolAddress, normAddr, type Chain } from "@/lib/chain/types";
import { syncWalletChange } from "@/lib/providers";

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

function parseChain(v: FormDataEntryValue | null): Chain | null {
  return v === "eth" || v === "sol" ? v : null;
}

/** Wallet of token toevoegen aan de watchlist. Free: max PLANS.free.maxWatchlist. */
export async function addWatch(_: ActionState, form: FormData): Promise<ActionState> {
  const p = await getProfile();
  if (!p) redirect("/login?next=/app/watchlist");
  const kind = form.get("kind") === "token" ? "token" : "wallet";
  const chain = parseChain(form.get("chain"));
  const raw = String(form.get("address") ?? "").trim();
  const label = String(form.get("label") ?? "").trim().slice(0, 60) || null;
  const minUsd = Number(String(form.get("min_usd") ?? "10000").replace(/[^\d.]/g, ""));

  if (!chain) return { error: "Kies Ethereum of Solana." };
  if (chain === "eth" ? !isEthAddress(raw) : !isSolAddress(raw))
    return { error: `Dat is geen geldig ${chain === "eth" ? "Ethereum" : "Solana"}-adres.` };
  if (!Number.isFinite(minUsd) || minUsd < 0) return { error: "Vul een geldig minimumbedrag in." };

  const db = supabaseAdmin();
  const { count } = await db.from("watchlist").select("id", { count: "exact", head: true }).eq("user_id", p.id);
  const max = planOf(p).maxWatchlist;
  if ((count ?? 0) >= max) return { error: `Je volgt al ${max} items. Met Pro volg je onbeperkt.` };

  const { error } = await db.from("watchlist").upsert(
    { user_id: p.id, kind, chain, address: normAddr(chain, raw), label, min_usd: minUsd },
    { onConflict: "user_id,kind,chain,address" },
  );
  if (error) return { error: "Opslaan lukte niet. Probeer het opnieuw." };
  // Zorg dat Helius/Alchemy dit adres ook doorsturen (anders zien we het nooit).
  // (ETH-tokens kan Address Activity niet volgen, zie README.)
  if (kind === "wallet" || chain === "sol") {
    await syncWalletChange(chain, { add: normAddr(chain, raw) }).catch((e) => console.error("[watchlist sync]", e));
  }
  revalidatePath("/app", "layout");
  return { ok: true, message: "Toegevoegd aan je watchlist." };
}

/** "Volg deze wallet/dit token" vanaf een publieke pagina. */
export async function followAction(form: FormData) {
  const p = await getProfile();
  const back = String(form.get("back") ?? "/app/watchlist");
  if (!p) redirect(`/login?next=${encodeURIComponent(back)}`);
  const res = await addWatch(null, form);
  redirect(res?.error ? `${back}?error=${encodeURIComponent(res.error)}` : "/app/watchlist?added=1");
}

export async function removeWatch(form: FormData) {
  const p = await getProfile();
  if (!p) redirect("/login");
  await supabaseAdmin().from("watchlist").delete().eq("id", String(form.get("id"))).eq("user_id", p.id);
  revalidatePath("/app", "layout");
}

export async function updateWatchThreshold(form: FormData) {
  const p = await getProfile();
  if (!p) redirect("/login");
  const minUsd = Number(String(form.get("min_usd") ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(minUsd)) return;
  await supabaseAdmin().from("watchlist").update({ min_usd: minUsd }).eq("id", String(form.get("id"))).eq("user_id", p.id);
  revalidatePath("/app/watchlist");
}

export async function saveNotifications(_: ActionState, form: FormData): Promise<ActionState> {
  const p = await getProfile();
  if (!p) redirect("/login");
  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({ notify_telegram: form.get("notify_telegram") === "on", notify_email: form.get("notify_email") === "on" })
    .eq("id", p.id);
  revalidatePath("/app/account");
  return error ? { error: "Opslaan lukte niet." } : { ok: true, message: "Opgeslagen." };
}

export async function unlinkTelegram() {
  const p = await getProfile();
  if (!p) redirect("/login");
  await supabaseAdmin()
    .from("profiles")
    .update({ telegram_user_id: null, telegram_username: null, telegram_link_code: crypto.randomUUID().replace(/-/g, "").slice(0, 18) })
    .eq("id", p.id);
  revalidatePath("/app/account");
}
