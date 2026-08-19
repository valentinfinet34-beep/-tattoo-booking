import { MapPin, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
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

export default async function AgendaPage() {
  const supabase = await createClient();

  const todayIso = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("status", "deposit_paid")
    .gte("preferred_date", todayIso)
    .order("preferred_date", { ascending: true })
    .order("scheduled_start_time", { ascending: true })
    .returns<Project[]>();

  const appointments = data ?? [];

  const byDate = new Map<string, Project[]>();
  for (const p of appointments) {
    const list = byDate.get(p.preferred_date) ?? [];
    list.push(p);
    byDate.set(p.preferred_date, list);
  }

  return (
    <div>
      <h1 className="mb-2 text-3xl text-zinc-100">Agenda</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Tes prochains rendez-vous confirmés, triés par date et heure.
      </p>

      {appointments.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Aucun rendez-vous confirmé à venir pour l&apos;instant.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(byDate.entries()).map(([date, projects]) => (
            <div key={date}>
              <h2 className="mb-3 font-display text-lg tracking-wide text-zinc-100">
                {formatDateHeading(date)}
              </h2>
              <div className="flex flex-col gap-3">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start gap-4 rounded-2xl border border-white/10 bg-zinc-900/80 p-4 shadow-2xl backdrop-blur-md transition-all hover:border-red-500/40"
                  >
                    <div className="flex min-w-16 flex-col items-start">
                      <span className="font-display text-xl text-accent">
                        {p.scheduled_start_time?.slice(0, 5) ?? p.time_slot}
                      </span>
                      {p.duration_hours && (
                        <span className="text-xs text-zinc-500">
                          {p.duration_hours} h
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-zinc-100">
                        {p.first_name} {p.last_name}
                      </p>
                      <p className="truncate text-sm text-zinc-400">
                        {p.description}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span className="flex items-center gap-1.5">
                          <MapPin size={12} /> {p.body_location} ·{" "}
                          {p.size_category ?? `${p.size_cm} cm`}
                        </span>
                        {p.style && <span>{p.style}</span>}
                        {p.color_mode && <span>{p.color_mode}</span>}
                        <span className="flex items-center gap-1.5">
                          <Phone size={12} /> {p.phone}
                        </span>
                      </div>
                    </div>
                    {p.image_urls.length > 0 && (
                      <div className="flex shrink-0 gap-1.5">
                        {p.image_urls.slice(0, 3).map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={url}
                            src={url}
                            alt={`Référence ${i + 1}`}
                            className="h-12 w-12 rounded-md border border-zinc-800 object-cover"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
