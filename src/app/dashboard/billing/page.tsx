import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { openCustomerPortal, startSubscriptionCheckout } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  trialing: "Essai gratuit en cours",
  active: "Abonnement actif",
  past_due: "Paiement en retard",
  canceled: "Abonnement annulé",
  incomplete: "Paiement incomplet",
  unpaid: "Impayé",
};

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: artist } = await supabase
    .from("artists")
    .select("subscription_status")
    .eq("id", user!.id)
    .single();

  const status = artist?.subscription_status;
  const isActive = status === "trialing" || status === "active";

  return (
    <div>
      <h1 className="mb-2 text-3xl text-zinc-100">Abonnement</h1>
      <p className="mb-6 text-sm text-zinc-500">
        29€/mois, 14 jours d&apos;essai gratuit, résiliable à tout moment.
      </p>

      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/90 p-5">
        {isActive ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 size={18} />
              <span className="text-sm font-medium">
                {STATUS_LABELS[status ?? ""] ?? status}
              </span>
            </div>
            <form action={openCustomerPortal}>
              <button type="submit" className="btn-secondary text-sm">
                Gérer mon abonnement
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-400">
              {status
                ? `Statut actuel : ${STATUS_LABELS[status] ?? status}`
                : "Aucun abonnement actif. Démarre ton essai gratuit de 14 jours pour utiliser Studio Ink."}
            </p>
            <form action={startSubscriptionCheckout}>
              <button type="submit" className="btn-primary">
                Démarrer l&apos;essai gratuit
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
