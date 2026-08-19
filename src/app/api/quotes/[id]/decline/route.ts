import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendQuoteDeclinedEmail } from "@/lib/email";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, artist_id, first_name, last_name, quoted_price_cents, status")
    .eq("id", id)
    .maybeSingle();

  if (!project || project.status !== "quoted") {
    return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update({ status: "quote_declined", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Échec de la mise à jour du projet" },
      { status: 500 }
    );
  }

  try {
    const { data: artistUser } = await supabase.auth.admin.getUserById(
      project.artist_id
    );
    if (artistUser.user?.email) {
      await sendQuoteDeclinedEmail({
        to: artistUser.user.email,
        clientFirstName: project.first_name,
        clientLastName: project.last_name,
        quotedPriceEur: (project.quoted_price_cents ?? 0) / 100,
      });
    }
  } catch {
    // La demande reste archivée même si la notification échoue.
  }

  return NextResponse.json({ success: true });
}
