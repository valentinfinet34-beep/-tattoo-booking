import { notFound } from "next/navigation";
import Image from "next/image";
import { TattooRequestForm } from "@/components/client/TattooRequestForm";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDayFullyBooked } from "@/lib/scheduling";
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT,
  isAccentColorKey,
} from "@/lib/theme-presets";

export const dynamic = "force-dynamic";

const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1532543149533-f0ed72f555c3?fm=jpg&q=80&w=1920&auto=format&fit=crop";

async function getArtistAndBlockedDates(slug: string) {
  const supabase = createAdminClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("id, display_name, cover_image_url, accent_color")
    .eq("slug", slug)
    .maybeSingle();

  if (!artist) return null;

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
    .filter(([, occupied]) => isDayFullyBooked(occupied))
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
      className="relative flex min-h-full flex-col items-center px-5 py-10"
      style={
        {
          "--color-accent": accent.base,
          "--color-accent-hover": accent.hover,
        } as React.CSSProperties
      }
    >
      <div className="absolute inset-0 -z-10 overflow-hidden bg-background">
        <Image
          src={artist.cover_image_url || DEFAULT_COVER_IMAGE}
          alt=""
          fill
          priority
          className="object-cover object-top contrast-110 saturate-125"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/25 to-background" />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex animate-fade-in-up items-center gap-2 [text-shadow:_0_2px_10px_rgb(0_0_0_/_75%)]">
          <div className="h-5 w-1.5 bg-accent" />
          <span className="font-display text-xl tracking-widest">
            {artist.display_name}
          </span>
        </div>

        <h1 className="mb-2 animate-fade-in-up text-4xl [animation-delay:250ms] [text-shadow:_0_2px_14px_rgb(0_0_0_/_75%)]">
          Réservez votre séance
        </h1>
        <p className="mb-6 animate-fade-in-up text-sm text-muted [animation-delay:450ms] [text-shadow:_0_1px_8px_rgb(0_0_0_/_85%)]">
          Remplissez le formulaire, l&apos;artiste valide sous 24-48h.
        </p>

        <div className="animate-fade-in-up [animation-delay:700ms]">
          <TattooRequestForm blockedDates={blockedDates} artistSlug={slug} />
        </div>
      </div>
    </div>
  );
}
