import Link from "next/link";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let subscriptionStatus: string | null = null;
  let trialDaysLeft: number | null = null;

  if (user) {
    const { data: artist } = await supabase
      .from("artists")
      .select("subscription_status, stripe_subscription_id")
      .eq("id", user.id)
      .single();

    subscriptionStatus = artist?.subscription_status ?? null;

    if (subscriptionStatus === "trialing" && artist?.stripe_subscription_id) {
      try {
        const subscription = await getStripe().subscriptions.retrieve(
          artist.stripe_subscription_id
        );
        if (subscription.trial_end) {
          const msLeft = subscription.trial_end * 1000 - Date.now();
          trialDaysLeft = Math.max(
            0,
            Math.ceil(msLeft / (1000 * 60 * 60 * 24))
          );
        }
      } catch {
        trialDaysLeft = null;
      }
    }
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-[#0a0a0c] text-white">
      {/* Enseigne néon en haut de page */}
      <div className="fixed top-0 left-1/2 h-[2px] w-3/4 max-w-4xl -translate-x-1/2 bg-red-500 shadow-[0_0_15px_#ef4444,0_0_30px_#ef4444,0_0_50px_#dc2626]" />
      {/* Halo lumineux qui éclaire le haut du dashboard */}
      <div className="pointer-events-none fixed top-0 left-1/2 h-[250px] w-[600px] -translate-x-1/2 rounded-full bg-red-600/20 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-2xl px-5 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1.5 bg-accent" />
            <span className="font-display text-xl tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]">
              TATT
              <span className="text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]">
                FLOW
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-red-500/40 bg-black/60 px-3 py-1.5 shadow-[0_0_15px_rgba(239,68,68,0.15)] sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-red-400">
                Système actif
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>

        {subscriptionStatus === "trialing" && trialDaysLeft !== null && (
          <Link
            href="/dashboard/settings#abonnement"
            className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm transition-colors hover:bg-accent/15"
          >
            <span className="flex items-center gap-2 text-zinc-100">
              <span>🎁</span>
              Essai gratuit —{" "}
              <strong>
                {trialDaysLeft} jour{trialDaysLeft > 1 ? "s" : ""} restant
                {trialDaysLeft > 1 ? "s" : ""}
              </strong>
            </span>
            <span className="shrink-0 text-xs text-accent underline">
              Gérer l&apos;abonnement →
            </span>
          </Link>
        )}

        <DashboardNav />

        {children}
      </div>
    </div>
  );
}
