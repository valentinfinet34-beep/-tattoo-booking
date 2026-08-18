import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendDeclineEmail } from "@/lib/email";

const declineSchema = z.object({
  message: z.string().trim().max(500).optional(),
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

  const body = await request.json().catch(() => ({}));
  const parsed = declineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Message invalide" }, { status: 400 });
  }

  // La RLS ("Artists can view own projects") garantit qu'on ne récupère
  // ce projet que s'il appartient bien à l'artiste connecté.
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("id, first_name, email")
    .eq("id", id)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update({ status: "declined", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Échec de la mise à jour du projet" },
      { status: 500 }
    );
  }

  const origin = request.headers.get("origin") ?? "http://localhost:3000";
  try {
    await sendDeclineEmail({
      to: project.email,
      firstName: project.first_name,
      artistMessage: parsed.data.message || null,
      rescheduleUrl: `${origin}/reschedule/${project.id}`,
    });
  } catch {
    // Le statut est mis à jour même si l'email échoue.
  }

  return NextResponse.json({ success: true });
}
