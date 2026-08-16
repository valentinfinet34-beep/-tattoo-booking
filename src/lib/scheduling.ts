export const BUSINESS_START_HOUR = 9;
export const BUSINESS_END_HOUR = 19;

export const DURATION_OPTIONS = [1, 1.5, 2, 3, 4, 5, 6, 8] as const;

export interface OccupiedRange {
  startTime: string; // "HH:MM"
  durationHours: number;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Génère les heures de début encore libres sur une journée de travail,
 * en excluant celles qui chevauchent un rendez-vous déjà confirmé.
 * Chaque créneau suppose une durée minimale d'1h pour être affiché
 * (on ne connaît pas encore la durée du nouveau projet à ce stade).
 */
export function generateAvailableSlots(occupied: OccupiedRange[]): string[] {
  const occupiedRanges = occupied.map((o) => ({
    start: timeToMinutes(o.startTime),
    end: timeToMinutes(o.startTime) + o.durationHours * 60,
  }));

  const slots: string[] = [];

  for (let hour = BUSINESS_START_HOUR; hour < BUSINESS_END_HOUR; hour++) {
    const slotStart = hour * 60;
    const slotEnd = slotStart + 60;
    const overlaps = occupiedRanges.some(
      (r) => slotStart < r.end && slotEnd > r.start
    );
    if (!overlaps) {
      slots.push(minutesToTime(slotStart));
    }
  }

  return slots;
}
