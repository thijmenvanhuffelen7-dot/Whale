import { supabaseAdmin } from "@/lib/supabase/admin";

/** Bekende settings-keys met hun type. Defaults staan in de migratie. */
export type Settings = {
  alert_threshold_usd: number;
  analyse_daily_limit: number;
  alerts_paused: boolean;
  chat_id: number | null;
  topic_eth: number | null;
  topic_sol: number | null;
  topic_digest: number | null;
  swap_threshold_usd: number;
  min_liquidity_usd: number;
  throttle_seconds: number;
  last_digest_date: string | null;
};

export const SETTING_DEFAULTS: Settings = {
  alert_threshold_usd: 250_000,
  analyse_daily_limit: 5,
  alerts_paused: false,
  chat_id: null,
  topic_eth: null,
  topic_sol: null,
  topic_digest: null,
  swap_threshold_usd: 10_000,
  min_liquidity_usd: 10_000,
  throttle_seconds: 120,
  last_digest_date: null,
};

/** Alle settings in één query, aangevuld met defaults. */
export async function getAllSettings(): Promise<Settings> {
  const { data, error } = await supabaseAdmin().from("settings").select("key, value");
  if (error) throw error;
  const out = { ...SETTING_DEFAULTS } as Record<string, unknown>;
  for (const row of data ?? []) if (row.value !== null) out[row.key] = row.value;
  return out as Settings;
}

export async function getSetting<K extends keyof Settings>(
  key: K,
): Promise<Settings[K] | null> {
  const { data, error } = await supabaseAdmin()
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return (data?.value ?? null) as Settings[K] | null;
}

export async function setSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
