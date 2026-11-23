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
};

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
