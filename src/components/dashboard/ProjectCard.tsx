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
  quoted: "Devis envoyé",
  accepted: "Accepté",
  deposit_paid: "Acompte payé",
  declined: "Refusé",
  quote_declined: "Devis refusé",
  expired: "Expiré",
};

const STATUS_BADGE_CLASSES: Record<Project["status"], string> = {
  pending: "badge-pending",
  quoted: "badge-quoted",
  accepted: "badge-accepted",
  deposit_paid: "badge-paid",
  declined: "badge-declined",
  quote_declined: "badge-declined",
  expired: "badge-declined",
};

const STATUS_BORDER_COLOR: Record<Project["status"], string> = {
  pending: "#eab308",
  quoted: "#71717a",
  accepted: "#3b82f6",
  deposit_paid: "#22c55e",
  declined: "#c81e1e",
  quote_declined: "#c81e1e",
  expired: "#c81e1e",
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
  const [quotedPrice, setQuotedPrice] = useState("");
  const [quoteDurationHours, setQuoteDurationHours] = useState<number>(2);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [showDecline, setShowDecline] = useState(false);
  const [declineMessage, setDeclineMessage] = useState("");
  const [declineLoading, setDeclineLoading] = useState(false);
  const [declineError, setDeclineError] = useState<string | null>(null);

  const depositPreview = computeDefaultAmount(depositDefaults, quotedPrice);

  const handleSendQuote = async () => {
    setQuoteLoading(true);
    setQuoteError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotedPriceEur: Number(quotedPrice),
          durationHours: quoteDurationHours,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setQuoteError(
          typeof body?.error === "string"
            ? body.error
            : "Échec de l'envoi du devis. Réessaie."
        );
        return;
      }

      router.refresh();
    } catch {
      setQuoteError("Échec de l'envoi du devis. Réessaie.");
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleDecline = async () => {
    setDeclineLoading(true);
    setDeclineError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: declineMessage }),
      });

      if (!res.ok) throw new Error("failed");

      router.refresh();
    } catch {
      setDeclineError("Échec du refus. Réessaie.");
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
                Prix estimé du tatouage (€)
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={quotedPrice}
                onChange={(e) => setQuotedPrice(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                Durée estimée
              </label>
              <select
                value={quoteDurationHours}
                onChange={(e) => setQuoteDurationHours(Number(e.target.value))}
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

          {depositDefaults && quotedPrice && Number(quotedPrice) > 0 && (
            <p className="text-xs text-zinc-500">
              Si le client accepte, il devra payer un acompte de{" "}
              <span className="text-zinc-300">{depositPreview} €</span>
              {depositDefaults.depositType === "percentage"
                ? ` (${depositDefaults.depositPercentage}%)`
                : " (montant fixe)"}
              .
            </p>
          )}

          <button
            type="button"
            onClick={handleSendQuote}
            disabled={quoteLoading || !quotedPrice || Number(quotedPrice) <= 0}
            className="btn-primary w-full"
          >
            {quoteLoading ? "Envoi..." : "Envoyer le devis"}
          </button>
          {quoteError && <p className="text-xs text-red-400">{quoteError}</p>}

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
              {declineError && (
                <p className="text-xs text-red-400">{declineError}</p>
              )}
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

      {project.status === "quoted" && (
        <div className="flex flex-col gap-1 border-t border-zinc-800 pt-4">
          <p className="text-xs text-zinc-500">
            Devis envoyé :{" "}
            <span className="text-zinc-300">
              {(project.quoted_price_cents ?? 0) / 100} €
            </span>{" "}
            {project.duration_hours && `· ${project.duration_hours} h estimées`}
          </p>
          <p className="text-xs text-zinc-500">
            En attente de la réponse du client — aucune action requise.
          </p>
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
            {project.status === "accepted" && project.deposit_expires_at && (
              <p className="text-xs text-zinc-500">
                Lien valable jusqu&apos;au{" "}
                {new Date(project.deposit_expires_at).toLocaleString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            <label className="text-xs text-zinc-500">
              Lien de paiement ({(project.deposit_amount_cents ?? 0) / 100} €)
            </label>
            <a
              href={`/pay/${project.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="input-field block truncate text-accent hover:underline"
            >
              {`/pay/${project.id}`}
            </a>
          </div>
        )}
    </div>
  );
}
