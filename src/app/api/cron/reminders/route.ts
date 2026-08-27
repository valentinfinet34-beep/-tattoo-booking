import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendAppointmentReminderEmail,
  sendPaymentReminderEmail,
  sendQuoteReminderEmail,
} from "@/lib/email";
import { isProPlan } from "@/lib/plan";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const REMINDER_DELAY_HOURS = 24;

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

  // Relances (formule Pro uniquement) : devis non repondus et acomptes
  // en attente de paiement depuis plus de 24h, jamais relances.
  const reminderCutoff = new Date(
    Date.now() - REMINDER_DELAY_HOURS * 60 * 60 * 1000
  ).toISOString();

  let quoteRemindersSent = 0;
  let paymentRemindersSent = 0;

  const { data: staleQuotes } = await admin
    .from("projects")
    .select("id, artist_id, first_name, email, quoted_price_cents")
    .eq("status", "quoted")
    .is("quote_reminder_sent_at", null)
    .lt("updated_at", reminderCutoff);

  for (const project of staleQuotes ?? []) {
    try {
      const { data: artist } = await admin
        .from("artists")
        .select("subscription_plan, subscription_status")
        .eq("id", project.artist_id)
        .single();

      if (!isProPlan(artist?.subscription_plan, artist?.subscription_status)) {
        continue;
      }

      await sendQuoteReminderEmail({
        to: project.email,
        firstName: project.first_name,
        quotedPriceEur: (project.quoted_price_cents ?? 0) / 100,
        quoteUrl: `${SITE_URL}/quote/${project.id}`,
      });

      await admin
        .from("projects")
        .update({ quote_reminder_sent_at: new Date().toISOString() })
        .eq("id", project.id);

      quoteRemindersSent++;
    } catch {
      // On continue avec les autres devis même si un envoi échoue.
    }
  }

  const { data: pendingPayments } = await admin
    .from("projects")
    .select(
      "id, artist_id, first_name, email, deposit_amount_cents, deposit_expires_at"
    )
    .eq("status", "accepted")
    .is("payment_reminder_sent_at", null)
    .lt("updated_at", reminderCutoff);

  for (const project of pendingPayments ?? []) {
    try {
      if (
        project.deposit_expires_at &&
        new Date(project.deposit_expires_at) < new Date()
      ) {
        continue;
      }

      const { data: artist } = await admin
        .from("artists")
        .select("subscription_plan, subscription_status")
        .eq("id", project.artist_id)
        .single();

      if (!isProPlan(artist?.subscription_plan, artist?.subscription_status)) {
        continue;
      }

      await sendPaymentReminderEmail({
        to: project.email,
        firstName: project.first_name,
        depositAmountEur: (project.deposit_amount_cents ?? 0) / 100,
        payUrl: `${SITE_URL}/pay/${project.id}`,
      });

      await admin
        .from("projects")
        .update({ payment_reminder_sent_at: new Date().toISOString() })
        .eq("id", project.id);

      paymentRemindersSent++;
    } catch {
      // On continue avec les autres paiements même si un envoi échoue.
    }
  }

  return NextResponse.json({
    sent,
    quoteRemindersSent,
    paymentRemindersSent,
  });
}
