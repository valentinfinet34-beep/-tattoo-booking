import { notFound } from "next/navigation";
import Image from "next/image";
import { ChevronDown, MapPin, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { TattooRequestForm } from "@/components/client/TattooRequestForm";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDayFullyBooked } from "@/lib/scheduling";
import { STYLES } from "@/lib/validations/tattooRequest.schema";
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
    .select(
      "id, display_name, avatar_url, city, bio, portfolio_images, cover_image_url, accent_color, welcome_message, practiced_styles, working_days, min_lead_days, hours_start, hours_end"
    )
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
  const portfolio = artist.portfolio_images ?? [];
  const specialties = artist.practiced_styles ?? [];

  return (
    <div
      style={
        {
          "--color-accent": accent.base,
          "--color-accent-hover": accent.hover,
        } as React.CSSProperties
      }
    >
      {/* HERO */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
        <div className="absolute inset-0 -z-10 bg-background">
          <Image
            src={artist.cover_image_url || DEFAULT_COVER_IMAGE}
            alt=""
            fill
            priority
            className="scale-105 object-cover object-top contrast-110 saturate-125"
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-black/30" />
        </div>

        {artist.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artist.avatar_url}
            alt={artist.display_name}
            className="mb-6 h-24 w-24 animate-fade-in-up rounded-full border-2 border-white/30 object-cover shadow-[0_0_50px_-8px_var(--color-accent)]"
          />
        ) : (
          <div className="mb-6 h-8 w-2 animate-fade-in-up bg-accent shadow-[0_0_30px_-2px_var(--color-accent)]" />
        )}

        <h1 className="animate-fade-in-up font-display text-6xl uppercase tracking-tight text-white [animation-delay:150ms] [text-shadow:_0_2px_20px_rgb(0_0_0_/_60%)] drop-shadow-[0_0_25px_var(--color-accent)] md:text-8xl">
          {artist.display_name}
        </h1>

        {artist.bio && (
          <p className="mt-5 max-w-xl animate-fade-in-up text-balance text-base leading-relaxed text-foreground/85 [animation-delay:300ms] md:text-lg">
            {artist.bio}
          </p>
        )}

        {(artist.city || specialties.length > 0) && (
          <div className="mt-6 flex max-w-2xl animate-fade-in-up flex-wrap justify-center gap-2 [animation-delay:450ms]">
            {artist.city && (
              <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs uppercase tracking-wide text-foreground/80 backdrop-blur-sm">
                <MapPin size={12} />
                {artist.city}
              </span>
            )}
            {specialties.map((style: string) => (
              <span
                key={style}
                className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs uppercase tracking-wide text-foreground/80 backdrop-blur-sm transition-colors hover:border-accent/60 hover:text-accent"
              >
                {style}
              </span>
            ))}
          </div>
        )}

        <a
          href="#reservation"
          className="mt-10 animate-fade-in-up rounded-full bg-accent px-9 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-white shadow-[0_0_35px_-6px_var(--color-accent)] transition-all duration-300 [animation-delay:600ms] hover:-translate-y-0.5 hover:shadow-[0_0_55px_-6px_var(--color-accent)]"
        >
          Réserver une séance
        </a>

        <ChevronDown
          size={22}
          className="absolute bottom-8 animate-bounce text-white/50"
        />
      </section>

      {/* GALERIE 3D */}
      {portfolio.length > 0 && (
        <section className="bg-background px-6 py-24 md:px-16">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 text-center text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Portfolio
            </p>
            <h2 className="mb-14 text-center font-display text-3xl tracking-tight text-foreground md:text-5xl">
              Mes réalisations
            </h2>

            <div className="grid grid-cols-1 gap-6 [perspective:1200px] md:grid-cols-3">
              {portfolio.map((url: string) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt="Réalisation"
                  className="aspect-[4/5] w-full rounded-2xl border border-white/10 object-cover shadow-xl shadow-black/40 transition-all duration-500 ease-out hover:rotate-x-3 hover:rotate-y-3 hover:scale-105 hover:shadow-[0_20px_50px_-10px_var(--color-accent)]"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* INFOS & REGLES */}
      <section className="border-y border-white/10 bg-surface/30 px-6 py-20 md:px-16">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-[0.2em] text-accent">
            Bon à savoir
          </p>
          <h2 className="mb-10 text-center font-display text-3xl tracking-tight text-foreground md:text-4xl">
            Avant de réserver
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            <RuleCard
              icon={<Sparkles size={20} />}
              title="Devis personnalisé"
              description="L'artiste étudie ta demande et te propose un prix avant tout engagement."
            />
            <RuleCard
              icon={<Wallet size={20} />}
              title="Acompte pour confirmer"
              description="Une fois le devis accepté, un acompte est demandé pour bloquer ton créneau."
            />
            <RuleCard
              icon={<ShieldCheck size={20} />}
              title="Hygiène aux normes"
              description="Matériel stérile à usage unique, conforme aux normes professionnelles."
            />
          </div>
          <p className="mt-8 text-center text-xs text-muted">
            Un empêchement ? Préviens l&apos;artiste au moins 48h à l&apos;avance.
          </p>
        </div>
      </section>

      {/* FORMULAIRE */}
      <section
        id="reservation"
        className="scroll-mt-6 bg-background px-5 py-24 md:px-16"
      >
        <div className="mx-auto w-full max-w-sm">
          <p className="mb-2 animate-fade-in-up text-xs font-medium uppercase tracking-[0.2em] text-accent">
            Réservation en ligne
          </p>
          <h2 className="mb-3 animate-fade-in-up font-display text-4xl tracking-tight text-foreground [animation-delay:100ms] md:text-5xl">
            Réservez votre séance
          </h2>
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
      </section>
    </div>
  );
}

function RuleCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 text-accent">{icon}</div>
      <p className="mb-1.5 text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs leading-relaxed text-muted">{description}</p>
    </div>
  );
}
