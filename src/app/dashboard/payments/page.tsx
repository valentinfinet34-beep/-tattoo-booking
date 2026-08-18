import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { connectStripeAccount } from "./actions";

export default async function PaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: artist } = await supabase
    .from("artists")
    .select("stripe_account_id, stripe_charges_enabled")
    .eq("id", user!.id)
    .single();

  const connected = !!artist?.stripe_charges_enabled;

  return (
    <div>
      <h1 className="mb-2 text-3xl text-zinc-100">Paiements</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Connecte ton compte Stripe pour recevoir directement les acomptes de
        tes clients — 100% du montant, sans commission.
      </p>

      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/90 p-5">
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
              {artist?.stripe_account_id
                ? "Ton compte Stripe est en cours de configuration — termine l'inscription pour pouvoir recevoir des acomptes."
                : "Aucun compte Stripe connecté pour l'instant. Sans ça, tu ne pourras pas accepter de projets."}
            </p>
            <form action={connectStripeAccount}>
              <button type="submit" className="btn-primary">
                {artist?.stripe_account_id
                  ? "Terminer la configuration"
                  : "Connecter mon compte Stripe"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
