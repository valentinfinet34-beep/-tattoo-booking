import Link from "next/link";
import { DemoProjectCard } from "@/components/demo/DemoProjectCard";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import type { Project } from "@/types/project";

const now = new Date();
const iso = (daysFromNow: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
};

const DEMO_PROJECTS: Project[] = [
  {
    id: "demo-1",
    artist_id: "demo",
    first_name: "Léa",
    last_name: "Moreau",
    email: "lea.moreau@example.com",
    phone: "06 12 34 56 78",
    description: "Un serpent minimaliste qui s'enroule sur l'avant-bras, trait fin.",
    body_location: "Avant-bras",
    size_cm: null,
    size_category: "Petit (< 5 cm)",
    style: "Minimaliste",
    color_mode: "Noir et gris",
    preferred_date: iso(3),
    time_slot: "14:00",
    image_urls: [],
    status: "pending",
    deposit_amount_cents: null,
    scheduled_start_time: null,
    duration_hours: null,
    stripe_checkout_url: null,
    stripe_session_id: null,
    deposit_terms_accepted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-2",
    artist_id: "demo",
    first_name: "Thomas",
    last_name: "Bernard",
    email: "t.bernard@example.com",
    phone: "06 98 76 54 32",
    description: "Manche japonaise, koï et vagues, projet sur plusieurs séances.",
    body_location: "Bras",
    size_cm: null,
    size_category: "Très grand (> 30 cm)",
    style: "Japonais",
    color_mode: "Couleur",
    preferred_date: iso(6),
    time_slot: "10:00",
    image_urls: [],
    status: "pending",
    deposit_amount_cents: null,
    scheduled_start_time: null,
    duration_hours: null,
    stripe_checkout_url: null,
    stripe_session_id: null,
    deposit_terms_accepted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-3",
    artist_id: "demo",
    first_name: "Camille",
    last_name: "Dubois",
    email: "camille.d@example.com",
    phone: "07 11 22 33 44",
    description: "Petit bouquet de fleurs sauvages, style linework.",
    body_location: "Cheville",
    size_cm: null,
    size_category: "Petit (< 5 cm)",
    style: "Minimaliste",
    color_mode: "Couleur",
    preferred_date: iso(9),
    time_slot: "16:00",
    image_urls: [],
    status: "accepted",
    deposit_amount_cents: 5000,
    scheduled_start_time: "16:00:00",
    duration_hours: 1.5,
    stripe_checkout_url: "#",
    stripe_session_id: null,
    deposit_terms_accepted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-4",
    artist_id: "demo",
    first_name: "Antoine",
    last_name: "Rousseau",
    email: "antoine.r@example.com",
    phone: "06 55 44 33 22",
    description: "Portrait réaliste en noir et gris, avant-bras complet.",
    body_location: "Avant-bras",
    size_cm: null,
    size_category: "Grand (15-30 cm)",
    style: "Réalisme",
    color_mode: "Noir et gris",
    preferred_date: iso(12),
    time_slot: "09:00",
    image_urls: [],
    status: "deposit_paid",
    deposit_amount_cents: 15000,
    scheduled_start_time: "09:00:00",
    duration_hours: 5,
    stripe_checkout_url: "#",
    stripe_session_id: null,
    deposit_terms_accepted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function DemoPage() {
  const pending = DEMO_PROJECTS.filter((p) => p.status === "pending");
  const awaitingPayment = DEMO_PROJECTS.filter((p) => p.status === "accepted");
  const confirmed = DEMO_PROJECTS.filter((p) => p.status === "deposit_paid");

  return (
    <div className="relative min-h-full bg-zinc-950">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950" />

      <div className="mx-auto max-w-2xl px-5 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1.5 bg-accent" />
            <span className="font-display text-xl tracking-widest text-zinc-100">
              STUDIO INK
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs text-zinc-500 hover:text-zinc-100"
            >
              Se connecter
            </Link>
            <Link href="/signup" className="btn-primary text-sm">
              Créer mon compte
            </Link>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-accent/30 bg-accent/10 p-4">
          <p className="text-sm text-zinc-200">
            <strong className="text-accent">Ceci est une démo</strong> — les
            demandes ci-dessous sont fictives, pour te montrer à quoi
            ressemble ton futur dashboard. Ton propre compte démarre vide.
          </p>
        </div>

        <div className="mb-8">
          <DashboardStats projects={DEMO_PROJECTS} />
        </div>

        <div className="flex flex-col gap-8">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="font-display text-lg tracking-wide text-zinc-100">
                Nouvelles demandes
              </h2>
              <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-xs text-zinc-400">
                {pending.length}
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {pending.map((p) => (
                <DemoProjectCard key={p.id} project={p} />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="font-display text-lg tracking-wide text-zinc-100">
                En attente de paiement
              </h2>
              <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-xs text-zinc-400">
                {awaitingPayment.length}
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {awaitingPayment.map((p) => (
                <DemoProjectCard key={p.id} project={p} />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="font-display text-lg tracking-wide text-zinc-100">
                Rendez-vous confirmés
              </h2>
              <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-xs text-zinc-400">
                {confirmed.length}
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {confirmed.map((p) => (
                <DemoProjectCard key={p.id} project={p} />
              ))}
            </div>
          </section>
        </div>

        <div className="mt-10 rounded-2xl border border-zinc-800/80 bg-zinc-900/90 p-6 text-center">
          <p className="mb-3 text-lg text-zinc-100">
            Convaincu ? Ton dashboard t&apos;attend.
          </p>
          <Link href="/signup" className="btn-primary inline-block">
            Créer mon compte
          </Link>
        </div>
      </div>
    </div>
  );
}
