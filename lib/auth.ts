import { redirect } from "next/navigation";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLANS, type PlanId } from "@/lib/plans";

export type Profile = {
  id: string;
  email: string | null;
  plan: PlanId;
  stripe_customer_id: string | null;
  telegram_user_id: number | null;
  telegram_username: string | null;
  telegram_link_code: string | null;
  notify_telegram: boolean;
  notify_email: boolean;
};

export async function getUser() {
  if (!supabaseConfigured()) return null;
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

export async function getProfile(): Promise<Profile | null> {
  const user = await getUser();
  if (!user) return null;
  const { data } = await supabaseAdmin().from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) return data as Profile;
  // Trigger nog niet gedraaid (bv. bestaande user): profiel aanmaken
  const { data: created } = await supabaseAdmin()
    .from("profiles")
    .upsert({ id: user.id, email: user.email })
    .select("*")
    .single();
  return created as Profile;
}

export async function requireProfile(next = "/app"): Promise<Profile> {
  const p = await getProfile();
  if (!p) redirect(`/login?next=${encodeURIComponent(next)}`);
  return p;
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function requireAdmin(): Promise<Profile> {
  const p = await requireProfile("/admin");
  if (!isAdminEmail(p.email)) redirect("/app");
  return p;
}

export function planOf(p: Profile | null) {
  return PLANS[p?.plan ?? "free"];
}
