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

const FEATURES = [
  "Page de réservation personnalisée (photo, couleur, galerie)",
  "Devis et acompte automatique via Stripe, 0% de commission",
  "Agenda avec disponibilités réelles, anti double-réservation",
  "Emails automatiques : devis, paiement, confirmation",
  "Relances automatiques (devis, paiement en attente)",
  "Statistiques : taux de conversion, no-shows",
];

export function SubscriptionSection({
  status,
  renewalDate,
}: {
  status: string | null;
  renewalDate: string | null;
}) {
  const isActive = status === "trialing" || status === "active";

  if (isActive) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 size={18} />
          <span className="text-sm font-medium">
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
          : "Aucun abonnement actif. Démarre ton essai gratuit de 14 jours."}
      </p>

      <div className="flex flex-col gap-4 rounded-2xl border border-accent/50 bg-accent/5 p-5 sm:max-w-sm">
        <div>
          <p className="font-display text-lg tracking-wide text-zinc-100">
            TattFlow
          </p>
          <p className="text-xs text-zinc-500">Toutes les fonctionnalités</p>
        </div>
        <p className="font-display text-3xl text-zinc-100">
          29€<span className="text-sm font-normal text-zinc-500">/mois</span>
        </p>
        <ul className="flex flex-col gap-2 text-xs text-zinc-400">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check size={13} className="mt-0.5 shrink-0 text-accent" />
              {f}
            </li>
          ))}
        </ul>
        <form action={startSubscriptionCheckout}>
          <button type="submit" className="btn-primary w-full">
            Démarrer l&apos;essai gratuit
          </button>
        </form>
      </div>
    </div>
  );
}
