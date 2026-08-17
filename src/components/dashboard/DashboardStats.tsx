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

  const upcoming = projects
    .filter((p) => p.status === "deposit_paid" && p.preferred_date >= todayIso)
    .sort((a, b) => a.preferred_date.localeCompare(b.preferred_date))[0];

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatTile label="En attente" value={String(pendingCount)} />
      <StatTile
        label="Prochain RDV"
        value={upcoming ? formatShortDate(upcoming.preferred_date) : "—"}
      />
      <StatTile
        label="Revenu ce mois"
        value={`${Math.round(revenueCents / 100)} €`}
      />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}

function formatShortDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
