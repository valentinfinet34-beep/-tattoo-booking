import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  AtSign,
  CalendarCheck2,
  ChevronDown,
  FileCheck2,
  Lock,
  MapPin,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { getPublicArtistBySlug } from "@/lib/public-artist";
import { TiltCard } from "@/components/client/TiltCard";
import { RevealSection } from "@/components/client/RevealSection";
import { Footer } from "@/components/Footer";
import {
  HeroParallaxBg,
  HeroParallaxContent,
} from "@/components/client/HeroParallax";
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT,
  isAccentColorKey,
} from "@/lib/theme-presets";

export const dynamic = "force-dynamic";

const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1759247943108-39e23e97fde4?fm=jpg&q=80&w=1920&auto=format&fit=crop";

const STEPS = [
  {
    icon: Send,
    title: "Envoie ta demande",
    description:
      "Décris ton projet, la zone, le style — une photo de référence si tu en as une.",
  },
  {
    icon: FileCheck2,
    title: "Reçois ton devis",
    description:
      "L'artiste étudie ta demande et te propose un prix personnalisé, sans engagement.",
  },
  {
    icon: Wallet,
    title: "Confirme avec un acompte",
    description:
      "Tu acceptes le devis et règles un acompte sécurisé pour bloquer ton créneau.",
  },
  {
    icon: CalendarCheck2,
    title: "Rendez-vous confirmé",
    description: "Ton créneau est réservé, tous les détails arrivent par email.",
  },
];

const FAQ = [
  {
    q: "Combien de temps avant d'avoir une réponse ?",
    a: "L'artiste étudie ta demande et te répond avec un devis personnalisé sous 24 à 48h.",
  },
  {
    q: "Le prix est-il fixe ?",
    a: "Non, le prix est établi par l'artiste selon ton projet (zone, taille, style) après étude de ta demande. Tu ne payes que si tu acceptes le devis.",
  },
  {
    q: "Que se passe-t-il si j'annule mon rendez-vous ?",
    a: "L'acompte versé n'est pas remboursable en cas d'annulation de ta part. Si l'artiste annule, il est intégralement remboursé sous 5 à 7 jours.",
  },
  {
    q: "Dois-je venir avec une photo de référence ?",
    a: "Ce n'est pas obligatoire, mais ça aide l'artiste à mieux cerner ton projet dès le départ.",
  },
  {
    q: "Comment se passe le paiement de l'acompte ?",
    a: "Une fois ton devis accepté, tu reçois un lien de paiement sécurisé Stripe pour régler l'acompte en ligne, en carte bancaire.",
  },
];

function normalizeInstagramUrl(value: string) {
  if (value.startsWith("http")) return value;
  return `https://instagram.com/${value.replace(/^@/, "")}`;
}

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
        <HeroParallaxBg>
          <div className="absolute inset-0 bg-background">
            <Image
              src={artist.cover_image_url || DEFAULT_COVER_IMAGE}
              alt=""
              fill
              priority
              className="scale-110 object-cover object-top contrast-110 saturate-125"
            />
            <div className="absolute inset-0 bg-black/55" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-black/30" />
          </div>
        </HeroParallaxBg>

        <HeroParallaxContent>
          {artist.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artist.avatar_url}
              alt={artist.display_name}
              className="mb-6 h-24 w-24 animate-fade-in-up rounded-full border-2 border-white/30 object-cover shadow-[0_0_60px_-8px_var(--color-accent)]"
            />
          ) : (
            <div className="mb-6 h-8 w-2 animate-fade-in-up bg-accent shadow-[0_0_30px_-2px_var(--color-accent)]" />
          )}

          <h1 className="animate-fade-in-up font-display text-6xl uppercase tracking-tight text-white [animation-delay:150ms] [text-shadow:_0_2px_20px_rgb(0_0_0_/_60%)] drop-shadow-[0_0_35px_var(--color-accent)] md:text-8xl">
            {artist.display_name}
          </h1>

          {artist.bio && (
            <p className="mt-5 max-w-xl animate-fade-in-up text-balance text-base leading-relaxed text-foreground/85 [animation-delay:300ms] md:text-lg">
              {artist.bio}
            </p>
          )}

          {(artist.city || specialties.length > 0 || artist.instagram_handle) && (
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
              {artist.instagram_handle && (
                <a
                  href={normalizeInstagramUrl(artist.instagram_handle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs uppercase tracking-wide text-foreground/80 backdrop-blur-sm transition-colors hover:border-accent/60 hover:text-accent"
                >
                  <AtSign size={12} />
                  Instagram
                </a>
              )}
            </div>
          )}

          <Link
            href={`/book/${slug}`}
            className="mt-10 animate-fade-in-up rounded-full bg-accent px-9 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-white shadow-[0_0_35px_-6px_var(--color-accent)] transition-all duration-300 [animation-delay:600ms] hover:-translate-y-0.5 hover:shadow-[0_0_55px_-6px_var(--color-accent)]"
          >
            Réserver une séance
          </Link>
        </HeroParallaxContent>

        <a href="#comment-ca-marche">
          <ChevronDown
            size={22}
            className="absolute bottom-8 animate-bounce text-white/50"
          />
        </a>
      </section>

      {/* COMMENT CA MARCHE */}
      <section
        id="comment-ca-marche"
        className="scroll-mt-6 bg-background px-6 py-24 md:px-16"
      >
        <div className="mx-auto max-w-5xl">
          <RevealSection className="text-center">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Le processus
            </p>
            <h2 className="mb-14 font-display text-3xl tracking-tight text-foreground md:text-5xl">
              Comment ça marche
            </h2>
          </RevealSection>

          <div className="grid gap-6 md:grid-cols-4">
            {STEPS.map((step, i) => (
              <RevealSection key={step.title} delay={i * 0.1}>
                <div className="relative h-full rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-accent/40 bg-accent/10 font-display text-lg text-accent">
                    {i + 1}
                  </span>
                  <step.icon className="mb-3 text-accent" size={20} />
                  <p className="mb-1.5 text-sm font-medium text-foreground">
                    {step.title}
                  </p>
                  <p className="text-xs leading-relaxed text-muted">
                    {step.description}
                  </p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* GALERIE 3D */}
      {portfolio.length > 0 && (
        <section className="bg-background px-6 py-24 md:px-16">
          <div className="mx-auto max-w-5xl">
            <RevealSection className="text-center">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
                Portfolio
              </p>
              <h2 className="mb-14 font-display text-3xl tracking-tight text-foreground md:text-5xl">
                Mes réalisations
              </h2>
            </RevealSection>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {portfolio.map((url: string, i: number) => (
                <TiltCard key={url} src={url} alt="Réalisation" index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECURITE & CONFIANCE */}
      <section className="border-y border-white/10 bg-surface/30 px-6 py-20 md:px-16">
        <div className="mx-auto max-w-3xl">
          <RevealSection className="text-center">
            <div className="mb-5 flex justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/40 bg-accent/10">
                <Lock className="text-accent" size={22} />
              </span>
            </div>
            <h2 className="mb-3 font-display text-3xl tracking-tight text-foreground md:text-4xl">
              Paiement 100% sécurisé
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-muted">
              Les acomptes sont traités par Stripe, leader mondial du paiement
              en ligne. Tes coordonnées bancaires ne transitent jamais par nos
              serveurs et ne sont jamais stockées.
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-xs uppercase tracking-wide text-muted">
              <span className="rounded-full border border-white/10 px-3.5 py-1.5">
                Paiement chiffré
              </span>
              <span className="rounded-full border border-white/10 px-3.5 py-1.5">
                Aucune carte stockée
              </span>
              <span className="rounded-full border border-white/10 px-3.5 py-1.5">
                Conforme RGPD
              </span>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* AVANT DE RESERVER */}
      <section className="bg-background px-6 py-20 md:px-16">
        <div className="mx-auto max-w-3xl">
          <RevealSection className="text-center">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Bon à savoir
            </p>
            <h2 className="mb-10 font-display text-3xl tracking-tight text-foreground md:text-4xl">
              Avant de réserver
            </h2>
          </RevealSection>
          <div className="grid gap-5 md:grid-cols-3">
            <RevealSection delay={0}>
              <RuleCard
                icon={<Sparkles size={20} />}
                title="Devis personnalisé"
                description="L'artiste étudie ta demande et te propose un prix avant tout engagement."
              />
            </RevealSection>
            <RevealSection delay={0.1}>
              <RuleCard
                icon={<Wallet size={20} />}
                title="Acompte pour confirmer"
                description="Une fois le devis accepté, un acompte est demandé pour bloquer ton créneau."
              />
            </RevealSection>
            <RevealSection delay={0.2}>
              <RuleCard
                icon={<ShieldCheck size={20} />}
                title="Hygiène aux normes"
                description="Matériel stérile à usage unique, conforme aux normes professionnelles."
              />
            </RevealSection>
          </div>
          <p className="mt-8 text-center text-xs text-muted">
            Un empêchement ? Préviens l&apos;artiste au moins 48h à l&apos;avance.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/10 bg-surface/30 px-6 py-20 md:px-16">
        <div className="mx-auto max-w-2xl">
          <RevealSection className="text-center">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Questions fréquentes
            </p>
            <h2 className="mb-10 font-display text-3xl tracking-tight text-foreground md:text-4xl">
              Tu te poses des questions ?
            </h2>
          </RevealSection>

          <div className="flex flex-col gap-3">
            {FAQ.map((item, i) => (
              <RevealSection key={item.q} delay={i * 0.06}>
                <details className="group rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 open:bg-white/[0.05]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-foreground marker:content-none">
                    {item.q}
                    <ChevronDown
                      size={16}
                      className="shrink-0 text-muted transition-transform duration-300 group-open:rotate-180"
                    />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {item.a}
                  </p>
                </details>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden bg-background px-6 py-24 text-center md:px-16">
        <div
          className="absolute inset-0 -z-10 opacity-20"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, var(--color-accent), transparent 60%)",
          }}
        />
        <RevealSection>
          <h2 className="mb-4 font-display text-4xl tracking-tight text-foreground md:text-6xl">
            Prêt à donner vie à ton projet ?
          </h2>
          <p className="mx-auto mb-8 max-w-md text-sm text-muted">
            Envoie ta demande en quelques minutes, sans DM, sans attente.
          </p>
          <Link
            href={`/book/${slug}`}
            className="inline-block rounded-full bg-accent px-9 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-white shadow-[0_0_35px_-6px_var(--color-accent)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_55px_-6px_var(--color-accent)]"
          >
            Réserver maintenant
          </Link>
        </RevealSection>
      </section>

      <Footer />
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
    <div className="h-full rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 text-accent">{icon}</div>
      <p className="mb-1.5 text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs leading-relaxed text-muted">{description}</p>
    </div>
  );
}
