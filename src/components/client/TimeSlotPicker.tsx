"use client";

import { useEffect, useState } from "react";

interface TimeSlotPickerProps {
  date: string;
  value: string;
  onChange: (time: string) => void;
}

export function TimeSlotPicker({ date, value, onChange }: TimeSlotPickerProps) {
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) {
      setSlots([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/availability?date=${date}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSlots(data.slots ?? []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date]);

  if (!date) {
    return (
      <p className="text-xs text-muted">
        Choisis d&apos;abord une date pour voir les horaires disponibles.
      </p>
    );
  }

  if (loading) {
    return <p className="text-xs text-muted">Chargement des horaires...</p>;
  }

  if (slots.length === 0) {
    return (
      <p className="text-xs text-muted">
        Aucun horaire disponible ce jour-là, choisis une autre date.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {slots.map((slot) => (
        <button
          key={slot}
          type="button"
          onClick={() => onChange(slot)}
          className={`rounded-md border py-2 text-xs transition-colors ${
            value === slot
              ? "border-accent bg-accent text-white"
              : "border-white/15 bg-white/[0.06] text-foreground hover:bg-white/10"
          }`}
        >
          {slot}
        </button>
      ))}
    </div>
  );
}
