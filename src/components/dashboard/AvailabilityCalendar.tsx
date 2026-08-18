"use client";

import { useState, useTransition } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isBefore,
  isSameMonth,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { blockDate, unblockDate } from "@/app/dashboard/availability/actions";

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

export function AvailabilityCalendar({
  initialBlockedDates,
}: {
  initialBlockedDates: string[];
}) {
  const [blockedDates, setBlockedDates] = useState<Set<string>>(
    new Set(initialBlockedDates)
  );
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [, startTransition] = useTransition();

  const today = startOfDay(new Date());
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = (getDay(monthStart) + 6) % 7;

  const toggleDate = (isoDate: string) => {
    const wasBlocked = blockedDates.has(isoDate);

    setBlockedDates((prev) => {
      const next = new Set(prev);
      if (wasBlocked) next.delete(isoDate);
      else next.add(isoDate);
      return next;
    });

    startTransition(async () => {
      try {
        if (wasBlocked) await unblockDate(isoDate);
        else await blockDate(isoDate);
      } catch {
        setBlockedDates((prev) => {
          const next = new Set(prev);
          if (wasBlocked) next.add(isoDate);
          else next.delete(isoDate);
          return next;
        });
      }
    });
  };

  const sortedBlocked = Array.from(blockedDates).sort();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 shadow-2xl backdrop-blur-md transition-all hover:border-red-500/40">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
            disabled={isSameMonth(viewMonth, today)}
            aria-label="Mois précédent"
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium capitalize text-zinc-100">
            {format(viewMonth, "MMMM yyyy", { locale: fr })}
          </span>
          <button
            type="button"
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            aria-label="Mois suivant"
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-zinc-500">
          {WEEKDAY_LABELS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.map((day) => {
            const isoDate = format(day, "yyyy-MM-dd");
            const isPast = isBefore(day, today);
            const isBlocked = blockedDates.has(isoDate);

            return (
              <button
                key={isoDate}
                type="button"
                disabled={isPast}
                onClick={() => toggleDate(isoDate)}
                className={`aspect-square rounded-md border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-25 ${
                  isBlocked
                    ? "border-accent/40 bg-accent/20 text-accent"
                    : "border-transparent text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs text-zinc-500">
          {sortedBlocked.length} jour{sortedBlocked.length > 1 ? "s" : ""}{" "}
          bloqué
          {sortedBlocked.length > 1 ? "s" : ""}
        </p>
        {sortedBlocked.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Aucun jour bloqué pour l&apos;instant.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sortedBlocked.map((isoDate) => (
              <span key={isoDate} className="badge badge-declined gap-2">
                {format(new Date(`${isoDate}T00:00:00`), "d MMM yyyy", {
                  locale: fr,
                })}
                <button
                  type="button"
                  onClick={() => toggleDate(isoDate)}
                  aria-label="Débloquer cette date"
                  className="text-zinc-500 transition-colors hover:text-accent"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
