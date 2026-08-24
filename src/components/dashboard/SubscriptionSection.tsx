import { CheckCircle2 } from "lucide-react";
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

export function SubscriptionSection({
  status,
  renewalDate,
}: {
  status: string | null;
  renewalDate: string | null;
}) {
  const isActive = status === "trialing" || status === "active";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">
        29€/mois, 14 jours d&apos;essai gratuit, résiliable à tout moment.
      </p>

      {isActive ? (
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
              Gérer l&apos;abonnement, annuler ou télécharger mes factures
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-400">
            {status
              ? `Statut actuel : ${STATUS_LABELS[status] ?? status}`
              : "Aucun abonnement actif. Démarre ton essai gratuit de 14 jours pour utiliser TattFlow."}
          </p>
          <form action={startSubscriptionCheckout}>
            <button type="submit" className="btn-primary">
              Démarrer l&apos;essai gratuit
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
