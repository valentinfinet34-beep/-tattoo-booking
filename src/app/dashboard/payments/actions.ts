"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function connectStripeAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Non authentifié");

  const { data: artist } = await supabase
    .from("artists")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  const stripe = getStripe();
  let accountId = artist?.stripe_account_id ?? null;

  if (!accountId) {
    const account = await stripe.accounts.create({ type: "standard" });
    accountId = account.id;

    await supabase
      .from("artists")
      .update({ stripe_account_id: accountId })
      .eq("id", user.id);
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${SITE_URL}/dashboard/payments`,
    return_url: `${SITE_URL}/api/stripe/connect/callback`,
    type: "account_onboarding",
  });

  redirect(accountLink.url);
}
