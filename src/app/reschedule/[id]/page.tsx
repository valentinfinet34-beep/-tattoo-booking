import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDayFullyBooked } from "@/lib/scheduling";
import { RescheduleForm } from "@/components/client/RescheduleForm";

export const dynamic = "force-dynamic";

async function getRescheduleData(projectId: string) {
  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, first_name, artist_id, status")
    .eq("id", projectId)
    .maybeSingle();

  if (!project || project.status !== "declined") return null;

  const { data: artist } = await supabase
    .from("artists")
    .select("slug, display_name")
    .eq("id", project.artist_id)
    .single();

  if (!artist) return null;

  const todayIso = new Date().toISOString().split("T")[0];

  const [{ data: manualBlocks }, { data: bookings }] = await Promise.all([
    supabase
      .from("blocked_dates")
      .select("blocked_date")
      .eq("artist_id", project.artist_id)
      .gte("blocked_date", todayIso),
    supabase
      .from("projects")
      .select("preferred_date, scheduled_start_time, duration_hours")
      .eq("artist_id", project.artist_id)
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
    .filter(([, occupied]) => isDayFullyBooked(occupied))
    .map(([date]) => date);

  const manualDates = (manualBlocks ?? []).map(
    (row) => row.blocked_date as string
  );

  const blockedDates = Array.from(new Set([...manualDates, ...fullyBookedDates]));

  return { project, artist, blockedDates };
}

export default async function ReschedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getRescheduleData(id);

  if (!result) notFound();

  const { project, artist, blockedDates } = result;

  return (
    <div className="flex min-h-full flex-col items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="h-5 w-1.5 bg-accent" />
          <span className="font-display text-xl tracking-widest">
            {artist.display_name}
          </span>
        </div>

        <h1 className="mb-2 text-4xl">Choisis une autre date</h1>
        <p className="mb-6 text-sm text-muted">
          Bonjour {project.first_name}, la date précédente ne convenait pas.
          Choisis un nouveau créneau ci-dessous, ta demande repart directement
          chez l&apos;artiste avec ces nouvelles infos.
        </p>

        <RescheduleForm
          projectId={project.id}
          artistSlug={artist.slug}
          blockedDates={blockedDates}
        />
      </div>
    </div>
  );
}
