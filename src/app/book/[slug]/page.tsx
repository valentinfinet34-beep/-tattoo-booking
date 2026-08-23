import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TattooRequestForm } from "@/components/client/TattooRequestForm";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicArtistBySlug } from "@/lib/public-artist";
import { isDayFullyBooked } from "@/lib/scheduling";
import { STYLES } from "@/lib/validations/tattooRequest.schema";
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT,
  isAccentColorKey,
} from "@/lib/theme-presets";

export const dynamic = "force-dynamic";

async function getArtistAndBlockedDates(slug: string) {
  const artist = await getPublicArtistBySlug(slug);
  if (!artist) return null;

  const supabase = createAdminClient();
  const todayIso = new Date().toISOString().split("T")[0];

  const [{ data: manualBlocks }, { data: bookings }] = await Promise.all([
    supabase
      .from("blocked_dates")
      .select("blocked_date")
      .eq("artist_id", artist.id)
      .gte("blocked_date", todayIso),
    supabase
      .from("projects")
      .select("preferred_date, scheduled_start_time, duration_hours")
      .eq("artist_id", artist.id)
      .gte("preferred_date", todayIso)
      .in("status", ["accepted", "deposit_paid"])
      .not("scheduled_start_time", "is", null),
  ]);

  const bookingsByDate = new Map<
    string,
    { startTime: string; durationHours: number }[]
  >();

  for (const b of bookings ?? []) {
    if (!b.scheduled_start_time || !b.duration_hours) continue;
    const existing = bookingsByDate.get(b.preferred_date) ?? [];
    existing.push({
      startTime: (b.scheduled_start_time as string).slice(0, 5),
      durationHours: b.duration_hours as number,
    });
    bookingsByDate.set(b.preferred_date, existing);
  }

  const fullyBookedDates = Array.from(bookingsByDate.entries())
    .filter(([, occupied]) =>
      isDayFullyBooked(occupied, {
        startHour: artist.hours_start ?? 9,
        endHour: artist.hours_end ?? 19,
      })
    )
    .map(([date]) => date);

  const manualDates = (manualBlocks ?? []).map(
    (row) => row.blocked_date as string
  );

  const blockedDates = Array.from(
    new Set([...manualDates, ...fullyBookedDates])
  );

  return { artist, blockedDates };
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getArtistAndBlockedDates(slug);

  if (!result) notFound();

  const { artist, blockedDates } = result;

  const accentKey =
    artist.accent_color && isAccentColorKey(artist.accent_color)
      ? artist.accent_color
      : DEFAULT_ACCENT;
  const accent = ACCENT_PRESETS[accentKey];

  return (
    <div
      className="flex min-h-full flex-col items-center px-5 py-10"
      style={
        {
          "--color-accent": accent.base,
          "--color-accent-hover": accent.hover,
        } as React.CSSProperties
      }
    >
      <div className="w-full max-w-sm">
        <Link
          href={`/tattooer/${slug}`}
          className="mb-6 flex animate-fade-in-up items-center gap-2 text-xs text-muted hover:text-foreground"
        >
          <ArrowLeft size={14} />
          {artist.display_name}
        </Link>

        <h1 className="mb-2 animate-fade-in-up text-4xl [animation-delay:100ms]">
          Réservez votre séance
        </h1>
        <p className="mb-8 animate-fade-in-up text-sm text-muted [animation-delay:200ms]">
          {artist.welcome_message ||
            "Remplissez le formulaire, l'artiste valide sous 24-48h."}
        </p>

        <div className="animate-fade-in-up [animation-delay:300ms]">
          <TattooRequestForm
            blockedDates={blockedDates}
            artistSlug={slug}
            workingDays={artist.working_days ?? undefined}
            minLeadDays={artist.min_lead_days ?? undefined}
            practicedStyles={
              (artist.practiced_styles as (typeof STYLES)[number][]) ??
              undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
