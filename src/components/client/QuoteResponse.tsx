"use client";

import { useState } from "react";

export function QuoteResponse({
  projectId,
  quotedPriceEur,
  depositPreviewEur,
  initialAction,
}: {
  projectId: string;
  quotedPriceEur: number;
  depositPreviewEur: number;
  initialAction?: string;
}) {
  const [loadingAction, setLoadingAction] = useState<
    "accept" | "decline" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);

  const handleAccept = async () => {
    setLoadingAction("accept");
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${projectId}/accept`, {
        method: "POST",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.payUrl) {
        setError(
          typeof body?.error === "string"
            ? body.error
            : "Échec de l'acceptation. Réessaie."
        );
        setLoadingAction(null);
        return;
      }
      window.location.href = body.payUrl;
    } catch {
      setError("Échec de l'acceptation. Réessaie.");
      setLoadingAction(null);
    }
  };

  const handleDecline = async () => {
    setLoadingAction("decline");
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${projectId}/decline`, {
        method: "POST",
      });
      if (!res.ok) {
        setError("Échec de l'envoi. Réessaie.");
        setLoadingAction(null);
        return;
      }
      setDeclined(true);
    } catch {
      setError("Échec de l'envoi. Réessaie.");
      setLoadingAction(null);
    }
  };

  if (declined) {
    return (
      <div className="card p-4 text-sm text-foreground">
        Ta réponse a bien été transmise à l&apos;artiste. Merci !
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-white/10 bg-surface/50 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <p className="text-sm text-muted">
        Si tu acceptes, un acompte de{" "}
        <strong className="text-foreground">{depositPreviewEur} €</strong> te
        sera demandé pour confirmer le rendez-vous.
      </p>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleAccept}
          disabled={loadingAction !== null}
          autoFocus={initialAction === "accept"}
          className="btn-primary w-full"
        >
          {loadingAction === "accept"
            ? "Un instant..."
            : `Accepter — ${quotedPriceEur} €`}
        </button>
        <button
          type="button"
          onClick={handleDecline}
          disabled={loadingAction !== null}
          className="btn-secondary w-full"
        >
          {loadingAction === "decline" ? "Un instant..." : "Décliner"}
        </button>
      </div>
    </div>
  );
}
