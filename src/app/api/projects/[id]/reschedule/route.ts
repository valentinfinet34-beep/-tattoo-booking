import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAvailableSlots } from "@/lib/scheduling";

const rescheduleSchema = z.object({
  preferredDate: z.string().min(1, "Choisis une date"),
  preferredTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Choisis un horaire"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = rescheduleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, artist_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!project || project.status !== "declined") {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  const { data: blocked } = await supabase
    .from("blocked_dates")
    .select("id")
    .eq("artist_id", project.artist_id)
    .eq("blocked_date", parsed.data.preferredDate)
    .maybeSingle();

  if (blocked) {
    return NextResponse.json(
      {
        error: {
          preferredDate: [
            "Le tatoueur est complet pour cette date, merci de choisir un autre créneau.",
          ],
        },
      },
      { status: 400 }
    );
  }

  const { data: bookings } = await supabase
    .from("projects")
    .select("scheduled_start_time, duration_hours")
    .eq("artist_id", project.artist_id)
    .eq("preferred_date", parsed.data.preferredDate)
    .in("status", ["accepted", "deposit_paid"])
    .not("scheduled_start_time", "is", null);

  const occupied = (bookings ?? [])
    .filter((b) => b.scheduled_start_time && b.duration_hours)
    .map((b) => ({
      startTime: (b.scheduled_start_time as string).slice(0, 5),
      durationHours: b.duration_hours as number,
    }));

  if (!generateAvailableSlots(occupied).includes(parsed.data.preferredTime)) {
    return NextResponse.json(
      {
        error: {
          preferredTime: [
            "Ce créneau n'est plus disponible, merci d'en choisir un autre.",
          ],
        },
      },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      preferred_date: parsed.data.preferredDate,
      time_slot: parsed.data.preferredTime,
      status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Échec de la mise à jour" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
