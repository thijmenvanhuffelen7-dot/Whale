import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { priceFor, stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const p = await getProfile();
  if (!p) return NextResponse.redirect(new URL("/login?next=/pricing", req.url), { status: 303 });
  const form = await req.formData();
  const interval = form.get("interval") === "month" ? "month" : "year";
  const price = priceFor(interval);
  if (!price || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Betalen is nog niet ingesteld (Stripe-keys ontbreken)." }, { status: 503 });
  }

  let customer = p.stripe_customer_id;
  if (!customer) {
    const c = await stripe().customers.create({ email: p.email ?? undefined, metadata: { user_id: p.id } });
    customer = c.id;
    await supabaseAdmin().from("profiles").update({ stripe_customer_id: customer }).eq("id", p.id);
  }

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: p.id,
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: { metadata: { user_id: p.id } },
    success_url: `${SITE.url}/app/account?checkout=success`,
    cancel_url: `${SITE.url}/pricing?canceled=1`,
  });
  return NextResponse.redirect(session.url!, { status: 303 });
}
