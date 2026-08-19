import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (!project || project.status !== "accepted") {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  await supabase
    .from("projects")
    .update({ deposit_terms_accepted_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
