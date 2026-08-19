"use client";

import { useState } from "react";
import { MapPin, Ruler, CalendarDays, Clock } from "lucide-react";
import type { Project } from "@/types/project";

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

export function DemoProjectCard({ project }: { project: Project }) {
  const [hint, setHint] = useState(false);

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/90 p-5"
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

      <p className="text-sm text-zinc-300">{project.description}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <MapPin size={13} /> {project.body_location}
        </span>
        <span className="flex items-center gap-1.5">
          <Ruler size={13} /> {project.size_category ?? `${project.size_cm} cm`}
        </span>
        {project.style && <span>{project.style}</span>}
        {project.color_mode && <span>{project.color_mode}</span>}
        <span className="flex items-center gap-1.5">
          <CalendarDays size={13} /> {formatDate(project.preferred_date)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={13} /> {project.time_slot}
        </span>
      </div>

      {project.status === "pending" && (
        <div className="flex flex-col gap-2 border-t border-zinc-800 pt-4">
          <div className="flex gap-2">
            <div className="input-field w-28 opacity-60">50</div>
            <button
              type="button"
              onClick={() => setHint(true)}
              className="btn-primary flex-1"
            >
              Valider & générer le lien
            </button>
          </div>
          {hint && (
            <p className="text-xs text-accent">
              C&apos;est une démo — crée ton compte pour essayer en vrai avec
              tes propres demandes.
            </p>
          )}
        </div>
      )}

      {(project.status === "accepted" || project.status === "deposit_paid") && (
        <div className="flex flex-col gap-2 border-t border-zinc-800 pt-4">
          <label className="text-xs text-zinc-500">
            Lien de paiement ({(project.deposit_amount_cents ?? 0) / 100} €)
          </label>
          <div className="input-field truncate text-accent opacity-60">
            https://tattoo-booking-tau.vercel.app/pay/••••••••••
          </div>
        </div>
      )}
    </div>
  );
}
