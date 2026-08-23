import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, MapPin, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { getPublicArtistBySlug } from "@/lib/public-artist";
import { TiltCard } from "@/components/client/TiltCard";
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT,
  isAccentColorKey,
} from "@/lib/theme-presets";

export const dynamic = "force-dynamic";

const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1532543149533-f0ed72f555c3?fm=jpg&q=80&w=1920&auto=format&fit=crop";

export default async function TattooerShowcasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artist = await getPublicArtistBySlug(slug);

  if (!artist) notFound();

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

        <Link
          href={`/book/${slug}`}
          className="mt-10 animate-fade-in-up rounded-full bg-accent px-9 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-white shadow-[0_0_35px_-6px_var(--color-accent)] transition-all duration-300 [animation-delay:600ms] hover:-translate-y-0.5 hover:shadow-[0_0_55px_-6px_var(--color-accent)]"
        >
          Réserver une séance
        </Link>

        {portfolio.length > 0 && (
          <a href="#portfolio">
            <ChevronDown
              size={22}
              className="absolute bottom-8 animate-bounce text-white/50"
            />
          </a>
        )}
      </section>

      {/* GALERIE 3D — suit la souris */}
      {portfolio.length > 0 && (
        <section id="portfolio" className="scroll-mt-6 bg-background px-6 py-24 md:px-16">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 text-center text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Portfolio
            </p>
            <h2 className="mb-14 text-center font-display text-3xl tracking-tight text-foreground md:text-5xl">
              Mes réalisations
            </h2>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {portfolio.map((url: string) => (
                <TiltCard key={url} src={url} alt="Réalisation" />
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

          <div className="mt-10 flex justify-center">
            <Link
              href={`/book/${slug}`}
              className="rounded-full bg-accent px-9 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-white shadow-[0_0_35px_-6px_var(--color-accent)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_55px_-6px_var(--color-accent)]"
            >
              Réserver maintenant
            </Link>
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
