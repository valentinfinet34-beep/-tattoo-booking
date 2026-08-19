"use client";

import { useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  blockedDates: string[];
  workingDays?: number[];
  minLeadDays?: number;
}

export function DatePicker({
  value,
  onChange,
  blockedDates,
  workingDays,
  minLeadDays = 0,
}: DatePickerProps) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));

  const today = startOfDay(new Date());
  const earliestAllowed = minLeadDays > 0 ? addDays(today, minLeadDays) : today;
  const blockedSet = new Set(blockedDates);
  const selectedDate = value ? new Date(`${value}T00:00:00`) : null;

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = (getDay(monthStart) + 6) % 7;

  return (
    <div className="rounded-md border border-white/15 bg-white/[0.06] p-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          disabled={isSameMonth(viewMonth, today)}
          aria-label="Mois précédent"
          className="rounded-md p-1 text-muted transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-medium capitalize">
          {format(viewMonth, "MMMM yyyy", { locale: fr })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="Mois suivant"
          className="rounded-md p-1 text-muted transition-colors hover:text-foreground"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted">
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
          const isPast = isBefore(day, earliestAllowed);
          const isNonWorkingDay = workingDays
            ? !workingDays.includes(getDay(day))
            : false;
          const isBlocked = blockedSet.has(isoDate);
          const isSelected = selectedDate
            ? isSameDay(day, selectedDate)
            : false;
          const disabled = isPast || isBlocked || isNonWorkingDay;

          return (
            <button
              key={isoDate}
              type="button"
              disabled={disabled}
              onClick={() => onChange(isoDate)}
              title={
                isNonWorkingDay
                  ? "Le tatoueur ne travaille pas ce jour-là."
                  : isBlocked
                    ? "Le tatoueur est complet pour cette date, merci de choisir un autre créneau."
                    : undefined
              }
              className={`aspect-square rounded-md text-xs transition-colors disabled:cursor-not-allowed ${
                isSelected
                  ? "bg-accent text-white"
                  : isBlocked || isNonWorkingDay
                    ? "text-muted/40 line-through"
                    : isPast
                      ? "text-muted/25"
                      : "text-foreground hover:bg-white/10"
              }`}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <p className="mt-3 text-xs text-muted">
          Sélectionné :{" "}
          <span className="text-foreground">
            {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
          </span>
        </p>
      )}
    </div>
  );
}
