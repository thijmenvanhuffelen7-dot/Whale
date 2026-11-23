import { NextResponse } from "next/server";
import { getProfile, planOf } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { analyzeToken } from "@/lib/analyse/run";
import { identifyFromScreenshot } from "@/lib/analyse/vision";
import { startOfAmsterdamDay } from "@/lib/digest";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Analyse vanaf de website: tekst (ticker/adres) of een screenshot. */
export async function POST(req: Request) {
  const p = await getProfile();
  if (!p) return NextResponse.json({ error: "Log in om te analyseren." }, { status: 401 });

  const limit = planOf(p).analysesPerDay;
  const db = supabaseAdmin();
  const { count } = await db
    .from("web_analyse_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", p.id)
    .gte("created_at", startOfAmsterdamDay().toISOString());
  if ((count ?? 0) >= limit) {
    return NextResponse.json(
      { error: `Je hebt vandaag je ${limit} analyses gebruikt.${p.plan === "pro" ? "" : " Met Pro krijg je er 50 per dag."}` },
      { status: 429 },
    );
  }

  const form = await req.formData();
  let query = String(form.get("query") ?? "").trim().slice(0, 64);
  const file = form.get("image");

  if (!query && file instanceof File && file.size) {
    if (!TYPES.includes(file.type)) return NextResponse.json({ error: "Upload een PNG, JPG of WEBP." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Afbeelding is groter dan 4 MB." }, { status: 400 });
    const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const found = await identifyFromScreenshot(b64, file.type);
    if (!found) {
      return NextResponse.json(
        { error: process.env.GROQ_API_KEY ? "We konden geen coin herkennen op deze afbeelding. Typ de ticker of het adres." : "Screenshot-analyse staat uit (geen GROQ_API_KEY)." },
        { status: 422 },
      );
    }
    query = found;
  }
  if (!query) return NextResponse.json({ error: "Typ een ticker of contractadres, of upload een screenshot." }, { status: 400 });

  const result = await analyzeToken(query, file instanceof File && file.size ? "screenshot" : "web");
  if (!result) return NextResponse.json({ error: `Geen token gevonden voor "${query}" op Ethereum of Solana.` }, { status: 404 });

  await db.from("web_analyse_log").insert({ user_id: p.id, query });
  return NextResponse.json({
    query,
    result: { ...result, token: { ...result.token, liquidityUsd: Number.isFinite(result.token.liquidityUsd) ? result.token.liquidityUsd : null } },
    remaining: limit - (count ?? 0) - 1,
  });
}
