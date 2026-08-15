"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/types/project";

const STATUS_LABELS: Record<Project["status"], string> = {
  pending: "En attente",
  accepted: "Accepté",
  deposit_paid: "Acompte payé",
  declined: "Refusé",
};

const STATUS_CLASSES: Record<Project["status"], string> = {
  pending: "badge-pending",
  accepted: "badge-accepted",
  deposit_paid: "badge-paid",
  declined: "badge-declined",
};

export function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const [amount, setAmount] = useState("50");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositAmountEur: Number(amount) }),
      });

      if (!res.ok) throw new Error("failed");

      router.refresh();
    } catch {
      setError("Échec de la génération du lien. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {project.first_name} {project.last_name}
          </p>
          <p className="text-xs text-muted">
            {project.email} · {project.phone}
          </p>
        </div>
        <span className={`badge ${STATUS_CLASSES[project.status]}`}>
          {STATUS_LABELS[project.status]}
        </span>
      </div>

      {project.image_urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {project.image_urls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={`Inspiration ${i + 1}`}
              className="aspect-square rounded-md border border-border object-cover"
            />
          ))}
        </div>
      )}

      <p className="text-sm text-foreground">{project.description}</p>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted">
        <span>Emplacement : {project.body_location}</span>
        <span>Taille : {project.size_cm} cm</span>
        <span>Date : {project.preferred_date}</span>
        <span>Créneau : {project.time_slot}</span>
      </div>

      {project.status === "pending" && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <label className="text-xs text-muted">
            Montant de l&apos;acompte (€)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field w-28"
            />
            <button
              type="button"
              onClick={handleAccept}
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? "Génération..." : "Valider & générer le lien"}
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}

      {(project.status === "accepted" || project.status === "deposit_paid") &&
        project.stripe_checkout_url && (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <label className="text-xs text-muted">
              Lien de paiement ({(project.deposit_amount_cents ?? 0) / 100} €)
            </label>
            <a
              href={project.stripe_checkout_url}
              target="_blank"
              rel="noopener noreferrer"
              className="input-field block truncate text-accent hover:underline"
            >
              {project.stripe_checkout_url}
            </a>
          </div>
        )}
    </div>
  );
}
