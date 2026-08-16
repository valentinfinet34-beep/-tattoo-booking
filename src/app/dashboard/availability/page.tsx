import { createClient } from "@/lib/supabase/server";
import { AvailabilityCalendar } from "@/components/dashboard/AvailabilityCalendar";

export default async function AvailabilityPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("blocked_dates")
    .select("blocked_date")
    .order("blocked_date", { ascending: true });

  const blockedDates = (data ?? []).map((row) => row.blocked_date as string);

  return (
    <div>
      <h1 className="mb-2 text-3xl">Disponibilités</h1>
      <p className="mb-6 text-sm text-muted">
        Clique sur un jour pour le marquer comme complet. Les clients ne
        pourront plus le sélectionner dans le formulaire de réservation.
      </p>

      <AvailabilityCalendar initialBlockedDates={blockedDates} />
    </div>
  );
}
