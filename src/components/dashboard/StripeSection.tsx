import { CheckCircle2 } from "lucide-react";
import { connectStripeAccount } from "@/app/dashboard/payments/actions";

interface PaymentHistoryRow {
  id: string;
  first_name: string;
  last_name: string;
  deposit_amount_cents: number | null;
  updated_at: string;
}

export function StripeSection({
  connected,
  hasAccount,
  paymentHistory,
}: {
  connected: boolean;
  hasAccount: boolean;
  paymentHistory: PaymentHistoryRow[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        {connected ? (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">
              Compte Stripe connecté — tu peux accepter des projets
            </span>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-zinc-400">
              {hasAccount
                ? "Ton compte Stripe est en cours de configuration — termine l'inscription pour pouvoir recevoir des acomptes."
                : "Aucun compte Stripe connecté pour l'instant. Sans ça, tu ne pourras pas accepter de projets."}
            </p>
            <form action={connectStripeAccount}>
              <button type="submit" className="btn-primary">
                {hasAccount
                  ? "Terminer la configuration"
                  : "Connecter mon compte Stripe"}
              </button>
            </form>
          </>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-zinc-300">
          Historique des paiements reçus
        </h3>
        {paymentHistory.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Aucun acompte encaissé pour l&apos;instant.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {paymentHistory.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-md border border-zinc-800 px-3 py-2 text-sm"
              >
                <span className="text-zinc-300">
                  {row.first_name} {row.last_name}
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(row.updated_at).toLocaleDateString("fr-FR")}
                </span>
                <span className="font-medium text-zinc-100">
                  {(row.deposit_amount_cents ?? 0) / 100} €
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
