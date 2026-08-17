import type { Project } from "@/types/project";

export function DashboardStats({ projects }: { projects: Project[] }) {
  const pendingCount = projects.filter((p) => p.status === "pending").length;

  const now = new Date();
  const todayIso = now.toISOString().split("T")[0];

  const revenueCents = projects
    .filter((p) => {
      if (p.status !== "deposit_paid") return false;
      const d = new Date(p.updated_at);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, p) => sum + (p.deposit_amount_cents ?? 0), 0);

  const upcomingCount = projects.filter(
    (p) => p.status === "deposit_paid" && p.preferred_date >= todayIso
  ).length;

  return (
    <div className="mb-8 grid grid-cols-3 gap-3">
      <StatTile
        label="Acomptes encaissés ce mois-ci"
        value={`${Math.round(revenueCents / 100)} €`}
      />
      <StatTile label="Demandes en attente" value={String(pendingCount)} />
      <StatTile label="Prochains RDV" value={String(upcomingCount)} />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/90 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-display text-2xl text-zinc-100">{value}</p>
    </div>
  );
}
