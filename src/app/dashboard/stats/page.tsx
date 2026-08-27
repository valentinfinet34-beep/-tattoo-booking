import Link from "next/link";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isProPlan } from "@/lib/plan";

function percent(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: artist } = await supabase
    .from("artists")
    .select("subscription_plan, subscription_status")
    .eq("id", user!.id)
    .single();

  if (!isProPlan(artist?.subscription_plan, artist?.subscription_status)) {
    return (
      <div>
        <h1 className="mb-2 text-3xl text-zinc-100">Statistiques</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Taux de conversion de tes demandes et suivi des no-shows.
        </p>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/80 p-8 text-center shadow-2xl backdrop-blur-md">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-accent/10">
            <Lock className="text-accent" size={20} />
          </span>
          <p className="font-display text-lg tracking-wide text-zinc-100">
            Disponible avec la formule Pro
          </p>
          <p className="max-w-sm text-sm text-zinc-500">
            Passe à la formule Pro pour suivre ton taux de conversion, tes
            no-shows, et débloquer les relances automatiques et la collecte
            d&apos;avis clients.
          </p>
          <Link
            href="/dashboard/settings#abonnement"
            className="btn-primary mt-2"
          >
            Voir les formules
          </Link>
        </div>
      </div>
    );
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("status, quoted_price_cents, no_show, preferred_date");

  const all = projects ?? [];
  const todayIso = new Date().toISOString().split("T")[0];

  const totalRequests = all.length;
  const quotesSent = all.filter((p) => p.quoted_price_cents !== null).length;
  const quotesAccepted = all.filter((p) =>
    ["accepted", "deposit_paid", "expired"].includes(p.status)
  ).length;
  const depositsPaid = all.filter((p) => p.status === "deposit_paid").length;
  const quoteDeclined = all.filter(
    (p) => p.status === "quote_declined"
  ).length;
  const expiredLinks = all.filter((p) => p.status === "expired").length;

  const pastAppointments = all.filter(
    (p) => p.status === "deposit_paid" && p.preferred_date < todayIso
  );
  const noShows = pastAppointments.filter((p) => p.no_show).length;

  return (
    <div>
      <h1 className="mb-2 text-3xl text-zinc-100">Statistiques</h1>
      <p className="mb-8 text-sm text-zinc-500">
        Basées sur l&apos;ensemble de tes demandes depuis la création de ton
        compte.
      </p>

      <div className="mb-10">
        <h2 className="mb-4 font-display text-lg tracking-wide text-zinc-100">
          Entonnoir de conversion
        </h2>
        <div className="flex flex-col gap-2">
          <FunnelRow
            label="Demandes reçues"
            value={totalRequests}
            rate={null}
          />
          <FunnelRow
            label="Devis envoyés"
            value={quotesSent}
            rate={percent(quotesSent, totalRequests)}
          />
          <FunnelRow
            label="Devis acceptés"
            value={quotesAccepted}
            rate={percent(quotesAccepted, quotesSent)}
          />
          <FunnelRow
            label="Acomptes payés"
            value={depositsPaid}
            rate={percent(depositsPaid, quotesAccepted)}
            highlight
          />
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Taux de conversion global :{" "}
          <span className="text-zinc-200">
            {percent(depositsPaid, totalRequests)}
          </span>{" "}
          des demandes reçues se terminent en rendez-vous payé.
        </p>
        {(quoteDeclined > 0 || expiredLinks > 0) && (
          <p className="mt-1 text-xs text-zinc-600">
            {quoteDeclined} devis décliné{quoteDeclined > 1 ? "s" : ""} ·{" "}
            {expiredLinks} lien{expiredLinks > 1 ? "s" : ""} de paiement
            expiré{expiredLinks > 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-4 font-display text-lg tracking-wide text-zinc-100">
          No-shows
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 shadow-2xl backdrop-blur-md">
            <p className="text-xs text-zinc-500">Rendez-vous passés</p>
            <p className="mt-1 font-display text-2xl text-zinc-100">
              {pastAppointments.length}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 shadow-2xl backdrop-blur-md">
            <p className="text-xs text-zinc-500">Taux de no-show</p>
            <p className="mt-1 font-display text-2xl text-zinc-100">
              {percent(noShows, pastAppointments.length)}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          {noShows} absence{noShows > 1 ? "s" : ""} sur les{" "}
          {pastAppointments.length} derniers rendez-vous confirmés. Marque un
          rendez-vous comme absent depuis l&apos;onglet Agenda.
        </p>
      </div>
    </div>
  );
}

function FunnelRow({
  label,
  value,
  rate,
  highlight,
}: {
  label: string;
  value: number;
  rate: string | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
        highlight
          ? "border-accent/40 bg-accent/5"
          : "border-white/10 bg-zinc-900/60"
      }`}
    >
      <span className="text-sm text-zinc-300">{label}</span>
      <span className="flex items-center gap-3">
        {rate && <span className="text-xs text-zinc-500">{rate}</span>}
        <span className="font-display text-xl text-zinc-100">{value}</span>
      </span>
    </div>
  );
}
