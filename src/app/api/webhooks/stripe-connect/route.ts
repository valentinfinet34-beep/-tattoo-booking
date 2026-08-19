import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDepositPaidEmail } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET!
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

      try {
        const { data: project } = await admin
          .from("projects")
          .select("artist_id, first_name, last_name, deposit_amount_cents")
          .eq("id", projectId)
          .single();

        if (project) {
          const { data: artist } = await admin
            .from("artists")
            .select("notify_deposit_paid")
            .eq("id", project.artist_id)
            .single();

          if (artist?.notify_deposit_paid) {
            const { data: artistUser } = await admin.auth.admin.getUserById(
              project.artist_id
            );
            if (artistUser.user?.email) {
              await sendDepositPaidEmail({
                to: artistUser.user.email,
                clientFirstName: project.first_name,
                clientLastName: project.last_name,
                depositAmountEur: (project.deposit_amount_cents ?? 0) / 100,
                dashboardUrl: `${SITE_URL}/dashboard/agenda`,
              });
            }
          }
        }
      } catch {
        // Le paiement reste confirmé même si la notification échoue.
      }
    }
  }

  return NextResponse.json({ received: true });
}
