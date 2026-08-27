import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const projectId = session.metadata?.project_id;

    if (projectId) {
      const admin = createAdminClient();
      await admin
        .from("projects")
        .update({ status: "deposit_paid", updated_at: new Date().toISOString() })
        .eq("id", projectId);
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const artistId = subscription.metadata?.artist_id;

    if (artistId) {
      const priceId = subscription.items.data[0]?.price.id;
      const plan =
        priceId === process.env.STRIPE_PRICE_PRO_ID
          ? "pro"
          : priceId === process.env.STRIPE_PRICE_NORMAL_ID
            ? "normal"
            : (subscription.metadata?.plan ?? null);

      const admin = createAdminClient();
      await admin
        .from("artists")
        .update({
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          subscription_plan: plan,
        })
        .eq("id", artistId);
    }
  }

  return NextResponse.json({ received: true });
}
