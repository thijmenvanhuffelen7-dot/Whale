import { NextResponse } from "next/server";
import { getFeed } from "@/lib/data";
import { parseFeedParams } from "@/lib/feed-params";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Feed voor de site. Pro: realtime. Anders: de 15 min vertraagde publieke view. */
export async function GET(req: Request) {
  const filter = parseFeedParams(new URL(req.url).searchParams);
  const profile = await getProfile().catch(() => null);
  const realtime = profile?.plan === "pro";
  const events = await getFeed(filter, realtime);
  return NextResponse.json({ events, realtime }, { headers: { "cache-control": "private, no-store" } });
}
