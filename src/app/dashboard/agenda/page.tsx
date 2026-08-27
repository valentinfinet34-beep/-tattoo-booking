import { createClient } from "@/lib/supabase/server";
import { AppointmentCard } from "@/components/dashboard/AppointmentCard";
import type { Project } from "@/types/project";

function formatDateHeading(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  const label = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function groupByDate(projects: Project[]) {
  const byDate = new Map<string, Project[]>();
  for (const p of projects) {
    const list = byDate.get(p.preferred_date) ?? [];
    list.push(p);
    byDate.set(p.preferred_date, list);
  }
  return byDate;
}

export default async function AgendaPage() {
  const supabase = await createClient();

  const todayIso = new Date().toISOString().split("T")[0];
  const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [{ data: upcomingData }, { data: pastData }] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("status", "deposit_paid")
      .gte("preferred_date", todayIso)
      .order("preferred_date", { ascending: true })
      .order("scheduled_start_time", { ascending: true })
      .returns<Project[]>(),
    supabase
      .from("projects")
      .select("*")
      .eq("status", "deposit_paid")
      .lt("preferred_date", todayIso)
      .gte("preferred_date", thirtyDaysAgoIso)
      .order("preferred_date", { ascending: false })
      .order("scheduled_start_time", { ascending: true })
      .returns<Project[]>(),
  ]);

  const upcoming = upcomingData ?? [];
  const past = pastData ?? [];
  const upcomingByDate = groupByDate(upcoming);
  const pastByDate = groupByDate(past);

  return (
    <div>
      <h1 className="mb-2 text-3xl text-zinc-100">Agenda</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Tes prochains rendez-vous confirmés, triés par date et heure.
      </p>

      {upcoming.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Aucun rendez-vous confirmé à venir pour l&apos;instant.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(upcomingByDate.entries()).map(([date, projects]) => (
            <div key={date}>
              <h2 className="mb-3 font-display text-lg tracking-wide text-zinc-100">
                {formatDateHeading(date)}
              </h2>
              <div className="flex flex-col gap-3">
                {projects.map((p) => (
                  <AppointmentCard key={p.id} project={p} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-1 font-display text-lg tracking-wide text-zinc-100">
            Rendez-vous passés (30 derniers jours)
          </h2>
          <p className="mb-4 text-xs text-zinc-500">
            Marque un rendez-vous comme absent si le client ne s&apos;est pas
            présenté.
          </p>
          <div className="flex flex-col gap-6">
            {Array.from(pastByDate.entries()).map(([date, projects]) => (
              <div key={date}>
                <h3 className="mb-3 text-sm tracking-wide text-zinc-400">
                  {formatDateHeading(date)}
                </h3>
                <div className="flex flex-col gap-3">
                  {projects.map((p) => (
                    <AppointmentCard key={p.id} project={p} showNoShowToggle />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
