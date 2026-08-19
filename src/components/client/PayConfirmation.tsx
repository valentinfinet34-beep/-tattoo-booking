"use client";

import { useState } from "react";

export function PayConfirmation({
  projectId,
  checkoutUrl,
  depositAmountEur,
}: {
  projectId: string;
  checkoutUrl: string;
  depositAmountEur: number;
}) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      await fetch(`/api/projects/${projectId}/accept-terms`, {
        method: "POST",
      });
    } catch {
      // Le paiement continue meme si l'horodatage echoue.
    }
    window.location.href = checkoutUrl;
  };

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-white/10 bg-surface/50 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">
          Conditions d&apos;annulation
        </p>
        <ul className="flex flex-col gap-2 text-sm text-muted">
          <li className="flex gap-2">
            <span className="text-accent">•</span>
            Si tu annules le rendez-vous, l&apos;acompte n&apos;est pas
            remboursable.
          </li>
          <li className="flex gap-2">
            <span className="text-accent">•</span>
            Si l&apos;artiste annule le rendez-vous, l&apos;acompte est
            intégralement remboursé sous 5 à 7 jours.
          </li>
        </ul>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-foreground/90">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
        />
        J&apos;ai lu et j&apos;accepte les conditions d&apos;annulation
        ci-dessus.
      </label>

      <button
        type="button"
        onClick={handlePay}
        disabled={!accepted || loading}
        className="btn-primary w-full"
      >
        {loading
          ? "Redirection..."
          : `Payer l'acompte — ${depositAmountEur} €`}
      </button>
    </div>
  );
}
