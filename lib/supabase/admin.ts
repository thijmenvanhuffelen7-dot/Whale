import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

let client: SupabaseClient | null = null;

/**
 * Supabase-client met de service role (geen NEXT_PUBLIC_, dus nooit in de browser-bundle).
 * Omzeilt RLS: alleen server-side gebruiken (API-routes, cron, bot, scripts).
 */
export function supabaseAdmin(): SupabaseClient {
  if (!client) {
    client = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}
