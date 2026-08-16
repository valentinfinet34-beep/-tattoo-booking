import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { sendDepositLinkEmail } from "@/lib/email";

const acceptSchema = z.object({
  depositAmountEur: z.coerce.number().positive().max(5000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  // La RLS ("Artists can view own projects") garantit qu'on ne récupère
  // ce projet que s'il appartient bien à l'artiste connecté.
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("id, first_name, last_name, email, description")
    .eq("id", id)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const amountCents = Math.round(parsed.data.depositAmountEur * 100);
  const origin = request.headers.get("origin") ?? "http://localhost:3000";

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: amountCents,
          product_data: {
            name: `Acompte tatouage — ${project.first_name} ${project.last_name}`,
            description: project.description.slice(0, 200),
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/dashboard?paid=1`,
    cancel_url: `${origin}/dashboard?canceled=1`,
    metadata: { project_id: project.id },
  });

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      status: "accepted",
      deposit_amount_cents: amountCents,
      stripe_checkout_url: session.url,
      stripe_session_id: session.id,
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
        depositAmountEur: parsed.data.depositAmountEur,
        checkoutUrl: session.url,
      });
    } catch {
      // Le lien reste affiché dans le dashboard même si l'email échoue.
    }
  }

  return NextResponse.json({ checkoutUrl: session.url });
}
