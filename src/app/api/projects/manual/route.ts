import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { sendDepositLinkEmail } from "@/lib/email";
import {
  BODY_LOCATIONS,
  COLOR_MODES,
  SIZE_CATEGORIES,
  STYLES,
} from "@/lib/validations/tattooRequest.schema";

const manualProjectSchema = z.object({
  firstName: z.string().trim().min(2, "Prénom trop court").max(50),
  lastName: z.string().trim().min(2, "Nom trop court").max(50),
  email: z.string().trim().email("Email invalide"),
  phone: z.string().trim().min(10, "Numéro invalide").max(20),
  description: z.string().trim().min(10, "Décris le projet").max(1000),
  bodyLocation: z.enum(BODY_LOCATIONS),
  sizeCategory: z.enum(SIZE_CATEGORIES),
  style: z.enum(STYLES),
  colorMode: z.enum(COLOR_MODES),
  preferredDate: z.string().min(1, "Choisis une date"),
  preferredTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Choisis un horaire"),
  durationHours: z.coerce.number().positive().max(12),
  depositAmountEur: z.coerce.number().positive().max(5000),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = manualProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data: artist } = await supabase
    .from("artists")
    .select("stripe_account_id, stripe_charges_enabled")
    .eq("id", user.id)
    .single();

  if (!artist?.stripe_account_id || !artist.stripe_charges_enabled) {
    return NextResponse.json(
      {
        error:
          "Connecte ton compte Stripe (onglet Paiements) avant de créer une demande.",
      },
      { status: 400 }
    );
  }

  const amountCents = Math.round(parsed.data.depositAmountEur * 100);
  const origin = request.headers.get("origin") ?? "http://localhost:3000";

  // Généré à l'avance pour pouvoir le passer dans les metadata Stripe dès
  // la création de la session (le webhook en a besoin pour retrouver le
  // projet une fois le paiement confirmé).
  const projectId = crypto.randomUUID();

  const session = await getStripe().checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: amountCents,
            product_data: {
              name: `Acompte tatouage — ${parsed.data.firstName} ${parsed.data.lastName}`,
              description: parsed.data.description.slice(0, 200),
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?paid=1`,
      cancel_url: `${origin}/dashboard?canceled=1`,
      metadata: { project_id: projectId },
    },
    { stripeAccount: artist.stripe_account_id }
  );

  const { error: insertError } = await supabase.from("projects").insert({
    id: projectId,
    artist_id: user.id,
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    description: parsed.data.description,
    body_location: parsed.data.bodyLocation,
    size_category: parsed.data.sizeCategory,
    style: parsed.data.style,
    color_mode: parsed.data.colorMode,
    preferred_date: parsed.data.preferredDate,
    time_slot: parsed.data.preferredTime,
    image_urls: [],
    status: "accepted",
    deposit_amount_cents: amountCents,
    scheduled_start_time: parsed.data.preferredTime,
    duration_hours: parsed.data.durationHours,
    stripe_checkout_url: session.url,
    stripe_session_id: session.id,
  });

  if (insertError) {
    return NextResponse.json(
      { error: "Échec de la création de la demande" },
      { status: 500 }
    );
  }

  if (session.url) {
    try {
      await sendDepositLinkEmail({
        to: parsed.data.email,
        firstName: parsed.data.firstName,
        depositAmountEur: parsed.data.depositAmountEur,
        payUrl: `${origin}/pay/${projectId}`,
      });
    } catch {
      // Le lien reste affiché dans le dashboard même si l'email échoue.
    }
  }

  return NextResponse.json({ success: true, checkoutUrl: session.url });
}
