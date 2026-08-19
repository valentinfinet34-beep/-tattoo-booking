import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { sendDepositLinkEmail, sendQuoteAcceptedEmail } from "@/lib/email";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, artist_id, first_name, last_name, email, description, time_slot, status, quoted_price_cents"
    )
    .eq("id", id)
    .maybeSingle();

  if (!project || project.status !== "quoted" || !project.quoted_price_cents) {
    return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  }

  const { data: artist } = await supabase
    .from("artists")
    .select(
      "stripe_account_id, stripe_charges_enabled, deposit_type, deposit_percentage, deposit_fixed_amount_cents, deposit_expiry_hours, notify_quote_accepted"
    )
    .eq("id", project.artist_id)
    .single();

  if (!artist?.stripe_account_id || !artist.stripe_charges_enabled) {
    return NextResponse.json(
      { error: "Le paiement n'est pas disponible pour le moment." },
      { status: 400 }
    );
  }

  const depositAmountCents =
    artist.deposit_type === "fixed"
      ? artist.deposit_fixed_amount_cents ??
        Math.round(project.quoted_price_cents * 0.2)
      : Math.round(
          (project.quoted_price_cents * (artist.deposit_percentage ?? 20)) /
            100
        );

  const origin = request.headers.get("origin") ?? "http://localhost:3000";
  const depositExpiresAt = new Date(
    Date.now() + (artist.deposit_expiry_hours ?? 48) * 60 * 60 * 1000
  ).toISOString();

  const session = await getStripe().checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: depositAmountCents,
            product_data: {
              name: `Acompte tatouage — ${project.first_name} ${project.last_name}`,
              description: project.description.slice(0, 200),
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?paid=1`,
      cancel_url: `${origin}/quote/${project.id}`,
      metadata: { project_id: project.id },
    },
    { stripeAccount: artist.stripe_account_id }
  );

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      status: "accepted",
      deposit_amount_cents: depositAmountCents,
      scheduled_start_time: project.time_slot,
      stripe_checkout_url: session.url,
      stripe_session_id: session.id,
      deposit_expires_at: depositExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Échec de la mise à jour du projet" },
      { status: 500 }
    );
  }

  if (session.url) {
    try {
      await sendDepositLinkEmail({
        to: project.email,
        firstName: project.first_name,
        depositAmountEur: depositAmountCents / 100,
        payUrl: `${origin}/pay/${project.id}`,
      });
    } catch {
      // Le lien reste accessible sur /pay/[id] même si l'email échoue.
    }
  }

  if (artist.notify_quote_accepted) {
    try {
      const { data: artistUser } = await supabase.auth.admin.getUserById(
        project.artist_id
      );
      if (artistUser.user?.email) {
        await sendQuoteAcceptedEmail({
          to: artistUser.user.email,
          clientFirstName: project.first_name,
          clientLastName: project.last_name,
          depositAmountEur: depositAmountCents / 100,
          dashboardUrl: `${origin}/dashboard`,
        });
      }
    } catch {
      // Le devis reste accepté même si la notification échoue.
    }
  }

  return NextResponse.json({ payUrl: `/pay/${project.id}` });
}
