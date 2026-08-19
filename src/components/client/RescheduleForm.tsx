"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DatePicker } from "./DatePicker";
import { TimeSlotPicker } from "./TimeSlotPicker";

export function RescheduleForm({
  projectId,
  artistSlug,
  blockedDates,
  workingDays,
  minLeadDays,
}: {
  projectId: string;
  artistSlug: string;
  blockedDates: string[];
  workingDays?: number[];
  minLeadDays?: number;
}) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!date || !time) {
      setError("Choisis une date et un horaire.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/projects/${projectId}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredDate: date, preferredTime: time }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        body?.error?.preferredDate?.[0] ??
          body?.error?.preferredTime?.[0] ??
          "Une erreur est survenue, réessaie."
      );
      setSubmitting(false);
      return;
    }

    router.push(`/confirmation?slug=${artistSlug}`);
  };

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-white/10 bg-surface/50 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-foreground/90">
          Nouvelle date
        </label>
        <DatePicker
          value={date}
          onChange={setDate}
          blockedDates={blockedDates}
          workingDays={workingDays}
          minLeadDays={minLeadDays}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-foreground/90">
          Nouvel horaire
        </label>
        <TimeSlotPicker
          date={date}
          value={time}
          onChange={setTime}
          artistSlug={artistSlug}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="btn-primary w-full"
      >
        {submitting ? "Envoi..." : "Proposer cette nouvelle date"}
      </button>
    </div>
  );
}
