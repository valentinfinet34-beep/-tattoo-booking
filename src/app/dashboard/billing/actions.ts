"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { TRIAL_DAYS } from "@/lib/plan";


export async function startSubscriptionCheckout() {
  const siteUrl = getSiteUrl({ headers: await headers() });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Non authentifié");

  const { data: artist } = await supabase
    .from("artists")
    .select("display_name, stripe_customer_id, stripe_subscription_id")
    .eq("id", user.id)
    .single();

  // L'essai gratuit n'est offert qu'une fois : un tatoueur qui a déjà eu un
  // abonnement (essai terminé ou annulé) doit passer par un abonnement normal,
  // avec carte, sinon il pourrait enchaîner les essais sans jamais payer.
  const hasHadSubscription = Boolean(artist?.stripe_subscription_id);

  const stripe = getStripe();
  let customerId = artist?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: artist?.display_name ?? undefined,
      metadata: { artist_id: user.id },
    });
    customerId = customer.id;

    // Colonne réservée au serveur : le tatoueur ne peut pas l'écrire lui-même.
    const { error: customerError } = await createAdminClient()
      .from("artists")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);

    if (customerError) {
      throw new Error("Échec de l'enregistrement du client Stripe");
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    // Essai sans carte bancaire : Stripe ne demande une carte que si le premier
    // paiement est supérieur à 0 € (donc jamais pendant l'essai).
    payment_method_collection: hasHadSubscription ? "always" : "if_required",
    line_items: [{ price: process.env.STRIPE_PRICE_SINGLE_ID!, quantity: 1 }],
    subscription_data: {
      ...(hasHadSubscription
        ? {}
        : {
            trial_period_days: TRIAL_DAYS,
            // Sans carte à la fin de l'essai, l'abonnement s'arrête (aucun prélèvement possible).
            trial_settings: {
              end_behavior: { missing_payment_method: "cancel" as const },
            },
          }),
      metadata: { artist_id: user.id, plan: "pro" },
    },
    success_url: `${siteUrl}/dashboard/settings?success=1#abonnement`,
    cancel_url: `${siteUrl}/dashboard/settings?canceled=1#abonnement`,
  });

  redirect(session.url!);
}

export async function openCustomerPortal() {
  const siteUrl = getSiteUrl({ headers: await headers() });
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
    return_url: `${siteUrl}/dashboard/settings#abonnement`,
  });

  redirect(portalSession.url);
}
