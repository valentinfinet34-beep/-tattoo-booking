import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAppointmentReminderEmail } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().split("T")[0];

  const { data: appointments } = await admin
    .from("projects")
    .select("artist_id, first_name, last_name, preferred_date, scheduled_start_time")
    .eq("status", "deposit_paid")
    .eq("preferred_date", tomorrowIso);

  let sent = 0;

  for (const appointment of appointments ?? []) {
    try {
      const { data: artist } = await admin
        .from("artists")
        .select("notify_reminder_24h")
        .eq("id", appointment.artist_id)
        .single();

      if (!artist?.notify_reminder_24h) continue;

      const { data: artistUser } = await admin.auth.admin.getUserById(
        appointment.artist_id
      );
      if (!artistUser.user?.email) continue;

      await sendAppointmentReminderEmail({
        to: artistUser.user.email,
        clientFirstName: appointment.first_name,
        clientLastName: appointment.last_name,
        appointmentDate: new Date(
          `${appointment.preferred_date}T00:00:00`
        ).toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
        appointmentTime: appointment.scheduled_start_time?.slice(0, 5) ?? "",
        dashboardUrl: `${SITE_URL}/dashboard/agenda`,
      });
      sent++;
    } catch {
      // On continue avec les autres rendez-vous même si un envoi échoue.
    }
  }

  return NextResponse.json({ sent });
}
