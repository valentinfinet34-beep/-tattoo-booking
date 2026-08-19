import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendQuoteEmail } from "@/lib/email";

const quoteSchema = z.object({
  quotedPriceEur: z.coerce.number().positive().max(50000),
  durationHours: z.coerce.number().positive().max(12),
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
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Prix ou durée invalide" }, { status: 400 });
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
          "Connecte ton compte Stripe (onglet Paiements) avant d'envoyer un devis.",
      },
      { status: 400 }
    );
  }

  // La RLS ("Artists can view own projects") garantit qu'on ne récupère
  // ce projet que s'il appartient bien à l'artiste connecté.
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("id, first_name, email, status")
    .eq("id", id)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  if (project.status !== "pending") {
    return NextResponse.json(
      { error: "Cette demande a déjà un devis en cours." },
      { status: 400 }
    );
  }

  const quotedPriceCents = Math.round(parsed.data.quotedPriceEur * 100);
  const origin = request.headers.get("origin") ?? "http://localhost:3000";

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      status: "quoted",
      quoted_price_cents: quotedPriceCents,
      duration_hours: parsed.data.durationHours,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Échec de l'enregistrement du devis" },
      { status: 500 }
    );
  }

  try {
    await sendQuoteEmail({
      to: project.email,
      firstName: project.first_name,
      quotedPriceEur: parsed.data.quotedPriceEur,
      quoteUrl: `${origin}/quote/${project.id}`,
    });
  } catch {
    // Le devis reste visible dans le dashboard même si l'email échoue.
  }

  return NextResponse.json({ success: true });
}
