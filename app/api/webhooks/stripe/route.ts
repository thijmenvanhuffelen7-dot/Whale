import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { syncSubscription } from "@/lib/subscriptions";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logWebhookFailure } from "@/lib/alerts/pipeline";
import { getBot } from "@/lib/bot/instance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  if (!secret || !sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const api = process.env.TELEGRAM_BOT_TOKEN ? getBot().api : null;
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        const userId = s.client_reference_id;
        const customer = typeof s.customer === "string" ? s.customer : s.customer?.id;
        if (userId && customer) await supabaseAdmin().from("profiles").update({ stripe_customer_id: customer }).eq("id", userId);
        if (s.subscription) {
          const sub = await stripe().subscriptions.retrieve(typeof s.subscription === "string" ? s.subscription : s.subscription.id);
          await syncSubscription(sub, api);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object, api);
        break;
    }
  } catch (err) {
    console.error("[stripe] verwerken mislukt", event.type, err);
    await logWebhookFailure("stripe", err, { type: event.type, id: event.id });
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
