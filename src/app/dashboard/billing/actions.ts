"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function startSubscriptionCheckout() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Non authentifié");

  const { data: artist } = await supabase
    .from("artists")
    .select("display_name, stripe_customer_id")
    .eq("id", user.id)
    .single();

  const stripe = getStripe();
  let customerId = artist?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: artist?.display_name ?? undefined,
      metadata: { artist_id: user.id },
    });
    customerId = customer.id;

    await supabase
      .from("artists")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_SINGLE_ID!, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { artist_id: user.id, plan: "pro" },
    },
    success_url: `${SITE_URL}/dashboard/settings?success=1#abonnement`,
    cancel_url: `${SITE_URL}/dashboard/settings?canceled=1#abonnement`,
  });

  redirect(session.url!);
}

export async function openCustomerPortal() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Non authentifié");

  const { data: artist } = await supabase
    .from("artists")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!artist?.stripe_customer_id) throw new Error("Aucun abonnement");

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: artist.stripe_customer_id,
    return_url: `${SITE_URL}/dashboard/settings#abonnement`,
  });

  redirect(portalSession.url);
}
