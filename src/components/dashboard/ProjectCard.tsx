"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Ruler,
  CalendarDays,
  Clock,
  Palette,
  Droplet,
} from "lucide-react";
import type { Project } from "@/types/project";
import { DURATION_OPTIONS } from "@/lib/scheduling";

const STATUS_LABELS: Record<Project["status"], string> = {
  pending: "En attente",
  accepted: "Accepté",
  deposit_paid: "Acompte payé",
  declined: "Refusé",
};

const STATUS_BADGE_CLASSES: Record<Project["status"], string> = {
  pending: "badge-pending",
  accepted: "badge-accepted",
  deposit_paid: "badge-paid",
  declined: "badge-declined",
};

const STATUS_BORDER_COLOR: Record<Project["status"], string> = {
  pending: "#eab308",
  accepted: "#3b82f6",
  deposit_paid: "#22c55e",
  declined: "#c81e1e",
};

function formatDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

type DepositDefaults = {
  depositType: "percentage" | "fixed";
  depositPercentage: number;
  depositFixedAmountCents: number | null;
};

function computeDefaultAmount(
  defaults: DepositDefaults | undefined,
  totalPrice: string
): string {
  if (!defaults) return "50";
  if (defaults.depositType === "fixed") {
    return defaults.depositFixedAmountCents
      ? String(defaults.depositFixedAmountCents / 100)
      : "50";
  }
  const total = Number(totalPrice);
  if (!total || total <= 0) return "";
  return String(Math.round((total * defaults.depositPercentage) / 100));
}

export function ProjectCard({
  project,
  depositDefaults,
}: {
  project: Project;
  depositDefaults?: DepositDefaults;
}) {
  const router = useRouter();
  const [totalPrice, setTotalPrice] = useState("");
  const [amount, setAmount] = useState(() =>
    computeDefaultAmount(depositDefaults, "")
  );
  const [amountTouched, setAmountTouched] = useState(false);
  const [startTime, setStartTime] = useState(project.time_slot || "10:00");
  const [durationHours, setDurationHours] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDecline, setShowDecline] = useState(false);
  const [declineMessage, setDeclineMessage] = useState("");
  const [declineLoading, setDeclineLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositAmountEur: Number(amount),
          scheduledStartTime: startTime,
          durationHours,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(
          typeof body?.error === "string"
            ? body.error
            : "Échec de la génération du lien. Réessaie."
        );
        return;
      }

      router.refresh();
    } catch {
      setError("Échec de la génération du lien. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setDeclineLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: declineMessage }),
      });

      if (!res.ok) throw new Error("failed");

      router.refresh();
    } catch {
      setError("Échec du refus. Réessaie.");
    } finally {
      setDeclineLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-900/80 p-5 shadow-2xl backdrop-blur-md transition-all hover:border-red-500/40"
      style={{
        borderLeftWidth: 4,
        borderLeftColor: STATUS_BORDER_COLOR[project.status],
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-100">
            {project.first_name} {project.last_name}
          </p>
          <p className="text-xs text-zinc-500">
            {project.email} · {project.phone}
          </p>
        </div>
        <span className={`badge ${STATUS_BADGE_CLASSES[project.status]}`}>
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
              className="aspect-square rounded-md border border-zinc-800 object-cover"
            />
          ))}
        </div>
      )}

      <p className="text-sm text-zinc-300">{project.description}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <MapPin size={13} /> {project.body_location}
        </span>
        <span className="flex items-center gap-1.5">
          <Ruler size={13} /> {project.size_category ?? `${project.size_cm} cm`}
        </span>
        {project.style && (
          <span className="flex items-center gap-1.5">
            <Palette size={13} /> {project.style}
          </span>
        )}
        {project.color_mode && (
          <span className="flex items-center gap-1.5">
            <Droplet size={13} /> {project.color_mode}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <CalendarDays size={13} /> {formatDate(project.preferred_date)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={13} /> {project.time_slot}
        </span>
      </div>

      {project.status === "pending" && (
        <div className="flex flex-col gap-3 border-t border-zinc-800 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                Heure de début réelle
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                Durée estimée
              </label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                style={{ colorScheme: "dark" }}
                className="input-field"
              >
                {DURATION_OPTIONS.map((h) => (
                  <option
                    key={h}
                    value={h}
                    style={{ backgroundColor: "#18181b", color: "#f4f4f5" }}
                  >
                    {h} h
                  </option>
                ))}
              </select>
            </div>
          </div>

          {depositDefaults?.depositType === "percentage" && (
            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                Prix total estimé (€) — optionnel
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={totalPrice}
                onChange={(e) => {
                  const value = e.target.value;
                  setTotalPrice(value);
                  if (!amountTouched) {
                    setAmount(computeDefaultAmount(depositDefaults, value));
                  }
                }}
                placeholder={`Ex: 200 → acompte ${depositDefaults.depositPercentage}% auto`}
                className="input-field w-full"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Montant de l&apos;acompte (€)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => {
                  setAmountTouched(true);
                  setAmount(e.target.value);
                }}
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
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}

          {!showDecline ? (
            <button
              type="button"
              onClick={() => setShowDecline(true)}
              className="self-start text-xs text-zinc-500 hover:text-accent"
            >
              Refuser cette demande
            </button>
          ) : (
            <div className="flex flex-col gap-2 rounded-md border border-zinc-800 p-3">
              <label className="text-xs text-zinc-500">
                Message au client (optionnel — ex: propose une autre date)
              </label>
              <textarea
                rows={2}
                value={declineMessage}
                onChange={(e) => setDeclineMessage(e.target.value)}
                className="input-field resize-none text-sm"
                placeholder="Je ne suis pas disponible ce jour-là, mais je peux te proposer le..."
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={declineLoading}
                  className="rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/20"
                >
                  {declineLoading ? "Envoi..." : "Confirmer le refus"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDecline(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-100"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(project.status === "accepted" || project.status === "deposit_paid") &&
        project.stripe_checkout_url && (
          <div className="flex flex-col gap-2 border-t border-zinc-800 pt-4">
            {project.scheduled_start_time && project.duration_hours && (
              <p className="text-xs text-zinc-500">
                RDV confirmé : {formatDate(project.preferred_date)} à{" "}
                {project.scheduled_start_time.slice(0, 5)} (
                {project.duration_hours} h)
              </p>
            )}
            <label className="text-xs text-zinc-500">
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
