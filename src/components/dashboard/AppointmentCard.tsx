"use client";

import { useState, useTransition } from "react";
import { MapPin, Phone, UserCheck, UserX } from "lucide-react";
import type { Project } from "@/types/project";
import { setNoShow } from "@/app/dashboard/agenda/actions";

export function AppointmentCard({
  project,
  showNoShowToggle = false,
}: {
  project: Project;
  showNoShowToggle?: boolean;
}) {
  const [noShow, setNoShowState] = useState(project.no_show);
  const [, startTransition] = useTransition();

  const toggle = () => {
    const next = !noShow;
    setNoShowState(next);
    startTransition(async () => {
      try {
        await setNoShow(project.id, next);
      } catch {
        setNoShowState(!next);
      }
    });
  };

  return (
    <div
      className={`flex items-start gap-4 rounded-2xl border p-4 shadow-2xl backdrop-blur-md transition-all ${
        noShow
          ? "border-accent/40 bg-accent/5"
          : "border-white/10 bg-zinc-900/80 hover:border-red-500/40"
      }`}
    >
      <div className="flex min-w-16 flex-col items-start">
        <span className="font-display text-xl text-accent">
          {project.scheduled_start_time?.slice(0, 5) ?? project.time_slot}
        </span>
        {project.duration_hours && (
          <span className="text-xs text-zinc-500">
            {project.duration_hours} h
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-zinc-100">
          {project.first_name} {project.last_name}
        </p>
        <p className="truncate text-sm text-zinc-400">
          {project.description}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <MapPin size={12} /> {project.body_location} ·{" "}
            {project.size_category ?? `${project.size_cm} cm`}
          </span>
          {project.style && <span>{project.style}</span>}
          {project.color_mode && <span>{project.color_mode}</span>}
          <span className="flex items-center gap-1.5">
            <Phone size={12} /> {project.phone}
          </span>
        </div>
        {showNoShowToggle && (
          <button
            type="button"
            onClick={toggle}
            className={`mt-2 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
              noShow
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-zinc-700 text-zinc-500 hover:text-zinc-100"
            }`}
          >
            {noShow ? <UserX size={12} /> : <UserCheck size={12} />}
            {noShow ? "Marqué absent — annuler" : "Marquer absent (no-show)"}
          </button>
        )}
      </div>
      {project.image_urls.length > 0 && (
        <div className="flex shrink-0 gap-1.5">
          {project.image_urls.slice(0, 3).map((url, i) => (
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
  );
}
