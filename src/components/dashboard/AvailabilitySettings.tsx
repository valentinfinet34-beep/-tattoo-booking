"use client";

import { useState, useTransition } from "react";
import { WORKING_DAYS_LABELS } from "@/lib/scheduling";
import { updateAvailabilitySettings } from "@/app/dashboard/settings/actions";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h);

export function AvailabilitySettings({
  workingDays,
  hoursStart,
  hoursEnd,
  minLeadDays,
}: {
  workingDays: number[];
  hoursStart: number;
  hoursEnd: number;
  minLeadDays: number;
}) {
  const [days, setDays] = useState<Set<number>>(new Set(workingDays));
  const [startHour, setStartHour] = useState(hoursStart);
  const [endHour, setEndHour] = useState(hoursEnd);
  const [leadDays, setLeadDays] = useState(minLeadDays);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const save = (
    nextDays: Set<number>,
    nextStart: number,
    nextEnd: number,
    nextLead: number
  ) => {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      try {
        await updateAvailabilitySettings({
          workingDays: Array.from(nextDays),
          hoursStart: nextStart,
          hoursEnd: nextEnd,
          minLeadDays: nextLead,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        setError("Échec de la mise à jour.");
      }
    });
  };

  const toggleDay = (value: number) => {
    const next = new Set(days);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setDays(next);
    save(next, startHour, endHour, leadDays);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="mb-2 block text-xs text-zinc-500">
          Jours travaillés
        </label>
        <div className="flex flex-wrap gap-2">
          {WORKING_DAYS_LABELS.map(({ value, label }) => {
            const active = days.has(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleDay(value)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-zinc-800 text-zinc-500 hover:text-zinc-100"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">
            Heure de début
          </label>
          <select
            value={startHour}
            onChange={(e) => {
              const next = Number(e.target.value);
              setStartHour(next);
              save(days, next, endHour, leadDays);
            }}
            style={{ colorScheme: "dark" }}
            className="input-field"
          >
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h} style={{ backgroundColor: "#18181b", color: "#f4f4f5" }}>
                {h}h
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">
            Heure de fin
          </label>
          <select
            value={endHour}
            onChange={(e) => {
              const next = Number(e.target.value);
              setEndHour(next);
              save(days, startHour, next, leadDays);
            }}
            style={{ colorScheme: "dark" }}
            className="input-field"
          >
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h} style={{ backgroundColor: "#18181b", color: "#f4f4f5" }}>
                {h}h
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-zinc-500">
          Délai minimum avant un rendez-vous
        </label>
        <p className="mb-2 text-xs text-zinc-500">
          Les clients ne pourront pas réserver avant ce délai (0 = aucune
          limite).
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={90}
            value={leadDays}
            onChange={(e) => setLeadDays(Number(e.target.value))}
            onBlur={() => save(days, startHour, endHour, leadDays)}
            className="input-field w-24"
          />
          <span className="text-sm text-zinc-500">jour(s)</span>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {saved && <p className="text-xs text-success">Enregistré</p>}
    </div>
  );
}
