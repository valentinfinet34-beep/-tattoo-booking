"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Ruler, CalendarDays, Clock } from "lucide-react";
import type { Project } from "@/types/project";
import { DURATION_OPTIONS } from "@/lib/scheduling";

const STATUS_LABELS: Record<Project["status"], string> = {
  pending: "En attente",
  accepted: "Accepté",
  deposit_paid: "Acompte payé",
  declined: "Refusé",
};

const STATUS_BADGE_CLASSES: Record<Project["status"], string> = {
  pending: "badge-pending",
  accepted: "badge-accepted",
  deposit_paid: "badge-paid",
  declined: "badge-declined",
};

const STATUS_BORDER_COLOR: Record<Project["status"], string> = {
  pending: "#eab308",
  accepted: "#3b82f6",
  deposit_paid: "#22c55e",
  declined: "#c81e1e",
};

function formatDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const [amount, setAmount] = useState("50");
  const [startTime, setStartTime] = useState(project.time_slot || "10:00");
  const [durationHours, setDurationHours] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositAmountEur: Number(amount),
          scheduledStartTime: startTime,
          durationHours,
        }),
      });

      if (!res.ok) throw new Error("failed");

      router.refresh();
    } catch {
      setError("Échec de la génération du lien. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/90 p-5 transition-all hover:border-zinc-700"
      style={{
        borderLeftWidth: 4,
        borderLeftColor: STATUS_BORDER_COLOR[project.status],
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-100">
            {project.first_name} {project.last_name}
          </p>
          <p className="text-xs text-zinc-500">
            {project.email} · {project.phone}
          </p>
        </div>
        <span className={`badge ${STATUS_BADGE_CLASSES[project.status]}`}>
          {STATUS_LABELS[project.status]}
        </span>
      </div>

      {project.image_urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {project.image_urls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={`Inspiration ${i + 1}`}
              className="aspect-square rounded-md border border-zinc-800 object-cover"
            />
          ))}
        </div>
      )}

      <p className="text-sm text-zinc-300">{project.description}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <MapPin size={13} /> {project.body_location}
        </span>
        <span className="flex items-center gap-1.5">
          <Ruler size={13} /> {project.size_cm} cm
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays size={13} /> {formatDate(project.preferred_date)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={13} /> {project.time_slot}
        </span>
      </div>

      {project.status === "pending" && (
        <div className="flex flex-col gap-3 border-t border-zinc-800 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                Heure de début réelle
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                Durée estimée
              </label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                style={{ colorScheme: "dark" }}
                className="input-field"
              >
                {DURATION_OPTIONS.map((h) => (
                  <option
                    key={h}
                    value={h}
                    style={{ backgroundColor: "#18181b", color: "#f4f4f5" }}
                  >
                    {h} h
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Montant de l&apos;acompte (€)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field w-28"
              />
              <button
                type="button"
                onClick={handleAccept}
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? "Génération..." : "Valider & générer le lien"}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}

      {(project.status === "accepted" || project.status === "deposit_paid") &&
        project.stripe_checkout_url && (
          <div className="flex flex-col gap-2 border-t border-zinc-800 pt-4">
            {project.scheduled_start_time && project.duration_hours && (
              <p className="text-xs text-zinc-500">
                RDV confirmé : {formatDate(project.preferred_date)} à{" "}
                {project.scheduled_start_time.slice(0, 5)} (
                {project.duration_hours} h)
              </p>
            )}
            <label className="text-xs text-zinc-500">
              Lien de paiement ({(project.deposit_amount_cents ?? 0) / 100} €)
            </label>
            <a
              href={project.stripe_checkout_url}
              target="_blank"
              rel="noopener noreferrer"
              className="input-field block truncate text-accent hover:underline"
            >
              {project.stripe_checkout_url}
            </a>
          </div>
        )}
    </div>
  );
}
