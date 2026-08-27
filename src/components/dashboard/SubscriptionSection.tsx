import { Check, CheckCircle2 } from "lucide-react";
import {
  openCustomerPortal,
  startSubscriptionCheckout,
} from "@/app/dashboard/billing/actions";

const STATUS_LABELS: Record<string, string> = {
  trialing: "Essai gratuit en cours",
  active: "Abonnement actif",
  past_due: "Paiement en retard",
  canceled: "Abonnement annulé",
  incomplete: "Paiement incomplet",
  unpaid: "Impayé",
};

const PLAN_NAMES: Record<string, string> = {
  normal: "Normal",
  pro: "Pro",
};

const PLANS = [
  {
    id: "normal" as const,
    name: "Normal",
    price: "19€",
    tagline: "L'essentiel pour sortir des DM",
    features: [
      "Page de réservation en ligne",
      "Devis et acompte automatique via Stripe",
      "Agenda anti-double réservation",
      "Emails automatiques de confirmation",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "35€",
    tagline: "Pour optimiser, pas juste automatiser",
    highlighted: true,
    features: [
      "Tout Normal, plus :",
      "Relances automatiques (devis, paiement en attente)",
      "Statistiques (conversion, no-shows)",
      "Page encore plus personnalisable",
      "Collecte automatique d'avis clients",
    ],
  },
];

export function SubscriptionSection({
  status,
  plan,
  renewalDate,
}: {
  status: string | null;
  plan: string | null;
  renewalDate: string | null;
}) {
  const isActive = status === "trialing" || status === "active";

  if (isActive) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 size={18} />
          <span className="text-sm font-medium">
            Formule {PLAN_NAMES[plan ?? ""] ?? "TattFlow"} —{" "}
            {STATUS_LABELS[status ?? ""] ?? status}
          </span>
        </div>
        {renewalDate && (
          <p className="text-xs text-zinc-500">
            {status === "trialing" ? "Premier prélèvement" : "Renouvellement"}{" "}
            le {renewalDate}
          </p>
        )}
        <form action={openCustomerPortal}>
          <button type="submit" className="btn-secondary text-sm">
            Gérer l&apos;abonnement, changer de formule, annuler ou
            télécharger mes factures
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-400">
        {status
          ? `Statut actuel : ${STATUS_LABELS[status] ?? status}`
          : "Aucun abonnement actif. Choisis ta formule pour démarrer ton essai gratuit de 14 jours."}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`flex flex-col gap-4 rounded-2xl border p-5 ${
              p.highlighted
                ? "border-accent/50 bg-accent/5"
                : "border-zinc-800 bg-zinc-900/50"
            }`}
          >
            <div>
              <p className="font-display text-lg tracking-wide text-zinc-100">
                {p.name}
              </p>
              <p className="text-xs text-zinc-500">{p.tagline}</p>
            </div>
            <p className="font-display text-3xl text-zinc-100">
              {p.price}
              <span className="text-sm font-normal text-zinc-500">/mois</span>
            </p>
            <ul className="flex flex-col gap-2 text-xs text-zinc-400">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check size={13} className="mt-0.5 shrink-0 text-accent" />
                  {f}
                </li>
              ))}
            </ul>
            <form action={startSubscriptionCheckout.bind(null, p.id)}>
              <button
                type="submit"
                className={p.highlighted ? "btn-primary w-full" : "btn-secondary w-full"}
              >
                Démarrer l&apos;essai gratuit
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
