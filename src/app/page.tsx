import Link from "next/link";
import {
  Calendar,
  Check,
  CreditCard,
  Mail,
  Smartphone,
  Wallet,
} from "lucide-react";
import { RevealSection } from "@/components/client/RevealSection";
import { Footer } from "@/components/Footer";

const VALUE_PROPS = [
  {
    icon: Mail,
    title: "Zéro DM, zéro prise de tête",
    description:
      "Une vraie page de réservation avec formulaire complet. Tes clients arrêtent de t'écrire en privé pour négocier date, prix et disponibilités.",
  },
  {
    icon: Wallet,
    title: "Devis et acompte automatiques",
    description:
      "Tu proposes un prix, le client accepte et paie son acompte en ligne via Stripe — versé directement sur ton propre compte, 0% de commission.",
  },
  {
    icon: Calendar,
    title: "Ton agenda à jour tout seul",
    description:
      "Les créneaux déjà pris disparaissent automatiquement du formulaire. Plus de double réservation, plus de calcul à la main.",
  },
];

const INCLUDED = [
  "Page de réservation personnalisée (photo, couleur, galerie)",
  "Devis et acomptes automatiques via Stripe, 0% de commission",
  "Agenda avec disponibilités réelles, anti double-réservation",
  "Emails automatiques : devis, paiement, rappels de RDV",
  "Installable sur ton téléphone comme une vraie appli",
];

export default function Home() {
  return (
    <div>
      {/* HERO */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
        <div
          className="absolute inset-0 -z-10 opacity-25"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(200,30,30,0.35), transparent 70%)",
          }}
        />

        <Link
          href="/login"
          className="absolute right-6 top-6 text-xs text-muted hover:text-foreground"
        >
          Se connecter
        </Link>

        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="h-5 w-1.5 bg-accent" />
          <span className="font-display text-xl tracking-widest">
            TATTFLOW
          </span>
        </div>

        <h1 className="max-w-4xl animate-fade-in-up font-display text-6xl uppercase leading-[0.95] tracking-tight text-white [animation-delay:150ms] drop-shadow-[0_0_30px_rgba(200,30,30,0.5)] md:text-8xl">
          Fini les DM Instagram
        </h1>
        <p className="mt-6 max-w-xl animate-fade-in-up text-balance text-base leading-relaxed text-foreground/85 [animation-delay:300ms] md:text-lg">
          Donne à tes clients une vraie page de réservation, avec devis et
          acompte automatique par Stripe. Toi, tu valides le prix. Le reste
          se fait tout seul.
        </p>

        <div className="mt-10 flex animate-fade-in-up flex-col items-center gap-3 [animation-delay:450ms]">
          <Link
            href="/signup"
            className="rounded-full bg-accent px-9 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-white shadow-[0_0_35px_-6px_rgba(200,30,30,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_55px_-6px_rgba(200,30,30,0.9)]"
          >
            Créer mon compte tatoueur
          </Link>
          <Link
            href="/demo"
            className="text-xs text-muted hover:text-foreground"
          >
            Voir une démo avant de s&apos;inscrire →
          </Link>
        </div>
      </section>

      {/* VALEUR */}
      <section className="bg-background px-6 py-24 md:px-16">
        <div className="mx-auto max-w-5xl">
          <RevealSection className="mb-14 text-center">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Pourquoi TattFlow
            </p>
            <h2 className="font-display text-3xl tracking-tight text-foreground md:text-5xl">
              Ce que ça change pour toi
            </h2>
          </RevealSection>

          <div className="grid gap-6 md:grid-cols-3">
            {VALUE_PROPS.map((prop, i) => (
              <RevealSection key={prop.title} delay={i * 0.1}>
                <div className="h-full rounded-xl border border-white/10 bg-white/[0.03] p-6">
                  <prop.icon className="mb-4 text-accent" size={24} />
                  <p className="mb-2 text-base font-medium text-foreground">
                    {prop.title}
                  </p>
                  <p className="text-sm leading-relaxed text-muted">
                    {prop.description}
                  </p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* TARIF */}
      <section className="border-y border-white/10 bg-surface/30 px-6 py-24 md:px-16">
        <div className="mx-auto max-w-lg">
          <RevealSection className="text-center">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Tarif
            </p>
            <h2 className="mb-10 font-display text-3xl tracking-tight text-foreground md:text-4xl">
              Un seul plan, tout inclus
            </h2>

            <div className="rounded-2xl border border-accent/30 bg-background p-8 shadow-[0_0_60px_-20px_rgba(200,30,30,0.4)]">
              <p className="mb-1 inline-block rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-accent">
                14 jours d&apos;essai gratuit
              </p>
              <p className="mt-4 font-display text-6xl text-foreground">
                29€
                <span className="text-lg font-normal text-muted">/mois</span>
              </p>
              <p className="mb-6 text-xs text-muted">
                Résiliable à tout moment, sans engagement.
              </p>

              <ul className="mb-8 flex flex-col gap-2.5 text-left text-sm text-foreground/90">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check size={16} className="mt-0.5 shrink-0 text-accent" />
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="block w-full rounded-full bg-accent px-6 py-3.5 text-center text-sm font-semibold uppercase tracking-[0.1em] text-white shadow-[0_0_30px_-8px_rgba(200,30,30,0.8)] transition-all duration-300 hover:-translate-y-0.5"
              >
                Démarrer l&apos;essai gratuit
              </Link>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-background px-6 py-24 text-center md:px-16">
        <RevealSection>
          <Smartphone className="mx-auto mb-4 text-accent" size={28} />
          <h2 className="mb-4 font-display text-4xl tracking-tight text-foreground md:text-6xl">
            Prêt à arrêter de gérer ça dans tes DM ?
          </h2>
          <p className="mx-auto mb-8 max-w-md text-sm text-muted">
            Crée ton compte en 2 minutes, aucune carte bancaire requise pour
            l&apos;essai.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-9 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-white shadow-[0_0_35px_-6px_rgba(200,30,30,0.8)] transition-all duration-300 hover:-translate-y-0.5"
          >
            <CreditCard size={16} />
            Créer mon compte
          </Link>
        </RevealSection>
      </section>

      <Footer />
    </div>
  );
}
