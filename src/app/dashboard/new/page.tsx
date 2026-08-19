import { createClient } from "@/lib/supabase/server";
import { isDayFullyBooked } from "@/lib/scheduling";
import { NewProjectForm } from "@/components/dashboard/NewProjectForm";

export default async function NewProjectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: artist } = await supabase
    .from("artists")
    .select(
      "slug, deposit_type, deposit_percentage, deposit_fixed_amount_cents, hours_start, hours_end"
    )
    .eq("id", user!.id)
    .single();

  const depositDefaults = {
    depositType: (artist?.deposit_type === "fixed" ? "fixed" : "percentage") as
      | "percentage"
      | "fixed",
    depositPercentage: artist?.deposit_percentage ?? 20,
    depositFixedAmountCents: artist?.deposit_fixed_amount_cents ?? null,
  };

  const todayIso = new Date().toISOString().split("T")[0];

  const [{ data: manualBlocks }, { data: bookings }] = await Promise.all([
    supabase
      .from("blocked_dates")
      .select("blocked_date")
      .eq("artist_id", user!.id)
      .gte("blocked_date", todayIso),
    supabase
      .from("projects")
      .select("preferred_date, scheduled_start_time, duration_hours")
      .eq("artist_id", user!.id)
      .gte("preferred_date", todayIso)
      .in("status", ["accepted", "deposit_paid"])
      .not("scheduled_start_time", "is", null),
  ]);

  const bookingsByDate = new Map<
    string,
    { startTime: string; durationHours: number }[]
  >();

  for (const b of bookings ?? []) {
    if (!b.scheduled_start_time || !b.duration_hours) continue;
    const existing = bookingsByDate.get(b.preferred_date) ?? [];
    existing.push({
      startTime: (b.scheduled_start_time as string).slice(0, 5),
      durationHours: b.duration_hours as number,
    });
    bookingsByDate.set(b.preferred_date, existing);
  }

  const fullyBookedDates = Array.from(bookingsByDate.entries())
    .filter(([, occupied]) =>
      isDayFullyBooked(occupied, {
        startHour: artist?.hours_start ?? 9,
        endHour: artist?.hours_end ?? 19,
      })
    )
    .map(([date]) => date);

  const manualDates = (manualBlocks ?? []).map(
    (row) => row.blocked_date as string
  );

  const blockedDates = Array.from(new Set([...manualDates, ...fullyBookedDates]));

  return (
    <div>
      <h1 className="mb-2 text-3xl text-zinc-100">Nouvelle demande</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Pour un client rencontré en boutique, au téléphone ou ailleurs qu'en
        ligne. Le lien de paiement de l&apos;acompte lui est envoyé
        immédiatement.
      </p>

      <NewProjectForm
        artistSlug={artist?.slug ?? ""}
        blockedDates={blockedDates}
        depositDefaults={depositDefaults}
      />
    </div>
  );
}
