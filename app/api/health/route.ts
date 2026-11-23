import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Status zonder geheimen: welke env-variabelen staan er (ja/nee) en is de
 * database bereikbaar. Handig om configuratiefouten op Vercel te vinden.
 */
export async function GET() {
  const has = (k: string) => Boolean(process.env[k] && process.env[k]!.trim());
  const env = {
    TELEGRAM_BOT_TOKEN: has("TELEGRAM_BOT_TOKEN"),
    TELEGRAM_WEBHOOK_SECRET: has("TELEGRAM_WEBHOOK_SECRET"),
    TELEGRAM_ADMIN_IDS: has("TELEGRAM_ADMIN_IDS"),
    NEXT_PUBLIC_SUPABASE_URL: has("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: has("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: has("SUPABASE_SERVICE_ROLE_KEY"),
    HELIUS_API_KEY: has("HELIUS_API_KEY"),
    ALCHEMY_API_KEY: has("ALCHEMY_API_KEY"),
    GROQ_API_KEY: has("GROQ_API_KEY"),
  };

  let database = "niet getest (Supabase-keys ontbreken)";
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(), {
        auth: { persistSession: false },
      });
      const { error } = await db.from("settings").select("key").limit(1);
      database = error ? `fout: ${error.message}` : "ok";
    } catch (e) {
      database = `fout: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  // Hint bij de bekendste fout: anon key i.p.v. service role key geplakt
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  let serviceKeyType = "onbekend";
  if (key.startsWith("sb_secret_")) serviceKeyType = "secret key (goed)";
  else if (key.startsWith("sb_publishable_")) serviceKeyType = "FOUT: dit is de publishable key, niet de service role key";
  else if (key.startsWith("eyJ")) {
    try {
      const role = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role;
      serviceKeyType = role === "service_role" ? "service_role (goed)" : `FOUT: dit is de ${role}-key, niet de service_role-key`;
    } catch {
      serviceKeyType = "onleesbaar";
    }
  }

  return NextResponse.json({ env, database, serviceKeyType }, { headers: { "cache-control": "no-store" } });
}
