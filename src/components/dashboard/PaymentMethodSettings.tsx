"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePaymentMethod } from "@/app/dashboard/settings/actions";
import type { PaymentMethod } from "@/lib/payment";

export function PaymentMethodSettings({
  method,
  link,
}: {
  method: PaymentMethod;
  link: string;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<PaymentMethod>(method);
  const [url, setUrl] = useState(link);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = choice !== method || (choice === "external_link" && url.trim() !== link);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await updatePaymentMethod({ method: choice, link: url });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Échec de l'enregistrement, réessaie dans un instant.");
    } finally {
      setSaving(false);
    }
  };

  const option = (value: PaymentMethod, title: string, description: string) => (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
        choice === value ? "border-accent/60 bg-accent/5" : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <input
        type="radio"
        name="payment-method"
        checked={choice === value}
        onChange={() => {
          setChoice(value);
          setSaved(false);
          setError(null);
        }}
        className="mt-1 h-4 w-4 shrink-0 accent-accent"
      />
      <span>
        <span className="block text-sm font-medium text-zinc-100">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">{description}</span>
      </span>
    </label>
  );

  return (
    <div className="flex flex-col gap-3">
      {option(
        "stripe",
        "Stripe (paiement automatique)",
        "Le client paie par carte et l'acompte est confirmé tout seul. Il faut un compte Stripe : l'argent arrive directement chez toi."
      )}
      {option(
        "external_link",
        "Mon propre lien de paiement",
        "PayPal.me, Lydia, Revolut, SumUp… Le client est envoyé sur ton lien. Tu confirmes toi-même la réception de l'acompte dans ton tableau de bord."
      )}

      {choice === "external_link" && (
        <div>
          <label htmlFor="payment-link" className="mb-1 block text-xs text-zinc-500">
            Ton lien de paiement
          </label>
          <input
            id="payment-link"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setSaved(false);
              setError(null);
            }}
            placeholder="https://paypal.me/tonnom"
            className="input-field"
          />
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
            TattFlow ne touche jamais à l&apos;argent et ne vérifie pas ce lien : vérifie-le toi-même.
            Les remboursements éventuels se règlent directement entre toi et ton client.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving || !changed}
        className="btn-primary w-full text-sm sm:w-auto"
      >
        {saving ? "Enregistrement..." : "Enregistrer"}
      </button>
      {saved && <p className="text-xs text-success">Enregistré</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
