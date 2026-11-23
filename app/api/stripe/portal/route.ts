import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const p = await getProfile();
  if (!p?.stripe_customer_id) return NextResponse.redirect(new URL("/pricing", req.url), { status: 303 });
  const s = await stripe().billingPortal.sessions.create({ customer: p.stripe_customer_id, return_url: `${SITE.url}/app/account` });
  return NextResponse.redirect(s.url, { status: 303 });
}
