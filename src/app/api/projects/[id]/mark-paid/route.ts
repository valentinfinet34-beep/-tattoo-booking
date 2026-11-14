import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Le tatoueur confirme avoir reçu l'acompte d'une demande réglée par son lien
 * de paiement externe (avec Stripe, la confirmation est automatique).
 */
export async function POST(
  _request: Request,
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

  // Filtré par tatoueur côté code, en plus de la RLS de la base.
  const { data: project } = await supabase
    .from("projects")
    .select("id, status, payment_method")
    .eq("id", id)
    .eq("artist_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  if (project.payment_method !== "external_link") {
    return NextResponse.json(
      { error: "Cet acompte est confirmé automatiquement par Stripe." },
      { status: 400 }
    );
  }

  if (project.status !== "accepted" && project.status !== "expired") {
    return NextResponse.json(
      { error: "Cette demande n'attend pas d'acompte." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("projects")
    .update({ status: "deposit_paid", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("artist_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Échec de la mise à jour" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
