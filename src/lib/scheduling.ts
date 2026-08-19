export const BUSINESS_START_HOUR = 9;
export const BUSINESS_END_HOUR = 19;

export const DURATION_OPTIONS = [1, 1.5, 2, 3, 4, 5, 6, 8] as const;

export const WORKING_DAYS_LABELS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
] as const;

export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6];

export interface OccupiedRange {
  startTime: string; // "HH:MM"
  durationHours: number;
}

export interface WorkingHours {
  startHour: number;
  endHour: number;
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
export function generateAvailableSlots(
  occupied: OccupiedRange[],
  hours: WorkingHours = { startHour: BUSINESS_START_HOUR, endHour: BUSINESS_END_HOUR }
): string[] {
  const occupiedRanges = occupied.map((o) => ({
    start: timeToMinutes(o.startTime),
    end: timeToMinutes(o.startTime) + o.durationHours * 60,
  }));

  const slots: string[] = [];

  for (let hour = hours.startHour; hour < hours.endHour; hour++) {
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

/**
 * Une journée est considérée pleine quand plus aucune heure de début
 * n'est disponible, même sans blocage manuel de la part de l'artiste.
 */
export function isDayFullyBooked(
  occupied: OccupiedRange[],
  hours?: WorkingHours
): boolean {
  return generateAvailableSlots(occupied, hours).length === 0;
}

/**
 * Vérifie qu'une date (ISO yyyy-MM-dd) tombe sur un jour travaillé et
 * respecte le délai minimum avant rendez-vous configurés par l'artiste.
 */
export function isDateBookable(
  dateIso: string,
  workingDays: number[],
  minLeadDays: number
): boolean {
  const date = new Date(`${dateIso}T00:00:00`);
  if (!workingDays.includes(date.getDay())) return false;

  if (minLeadDays > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + minLeadDays);
    if (date < minDate) return false;
  }

  return true;
}
