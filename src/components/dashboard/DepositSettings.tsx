"use client";

import { useState, useTransition } from "react";
import { setDepositDefaults } from "@/app/dashboard/settings/actions";

const EXPIRY_OPTIONS = [
  { hours: 4, label: "4 heures" },
  { hours: 12, label: "12 heures" },
  { hours: 24, label: "24 heures" },
  { hours: 48, label: "48 heures" },
  { hours: 72, label: "3 jours" },
  { hours: 168, label: "7 jours" },
];

export function DepositSettings({
  depositType,
  depositPercentage,
  depositFixedAmountCents,
  depositExpiryHours,
}: {
  depositType: "percentage" | "fixed";
  depositPercentage: number;
  depositFixedAmountCents: number | null;
  depositExpiryHours: number;
}) {
  const [type, setType] = useState<"percentage" | "fixed">(depositType);
  const [percentage, setPercentage] = useState(depositPercentage);
  const [fixedAmount, setFixedAmount] = useState(
    depositFixedAmountCents ? depositFixedAmountCents / 100 : 50
  );
  const [expiryHours, setExpiryHours] = useState(depositExpiryHours);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  const save = (
    nextType: "percentage" | "fixed",
    nextPercentage: number,
    nextFixedAmount: number,
    nextExpiryHours: number
  ) => {
    setSaved(false);
    startTransition(async () => {
      try {
        await setDepositDefaults({
          depositType: nextType,
          depositPercentage: nextPercentage,
          depositFixedAmountEur: nextFixedAmount,
          depositExpiryHours: nextExpiryHours,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        // silencieux, l'utilisateur peut reessayer
      }
    });
  };

  return (
    <div>
      <h2 className="mb-3 font-display text-lg tracking-wide text-zinc-100">
        Acompte par défaut
      </h2>
      <p className="mb-4 text-xs text-zinc-500">
        Se pré-remplit automatiquement quand un client accepte un devis — tu
        peux toujours l&apos;ajuster au cas par cas.
      </p>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setType("percentage");
            save("percentage", percentage, fixedAmount, expiryHours);
          }}
          className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
            type === "percentage"
              ? "border-accent bg-accent/10 text-accent"
              : "border-zinc-800 text-zinc-500 hover:text-zinc-100"
          }`}
        >
          Pourcentage du prix total
        </button>
        <button
          type="button"
          onClick={() => {
            setType("fixed");
            save("fixed", percentage, fixedAmount, expiryHours);
          }}
          className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
            type === "fixed"
              ? "border-accent bg-accent/10 text-accent"
              : "border-zinc-800 text-zinc-500 hover:text-zinc-100"
          }`}
        >
          Montant fixe
        </button>
      </div>

      {type === "percentage" ? (
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Pourcentage</span>
            <span className="font-display text-2xl text-accent">
              {percentage}%
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={percentage}
            onChange={(e) => setPercentage(Number(e.target.value))}
            onMouseUp={() =>
              save("percentage", percentage, fixedAmount, expiryHours)
            }
            onTouchEnd={() =>
              save("percentage", percentage, fixedAmount, expiryHours)
            }
            className="w-full accent-accent"
          />
          <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
            <span>5%</span>
            <span>50%</span>
          </div>
        </div>
      ) : (
        <div className="mb-5 flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={fixedAmount}
            onChange={(e) => setFixedAmount(Number(e.target.value))}
            onBlur={() => save("fixed", percentage, fixedAmount, expiryHours)}
            className="input-field w-28"
          />
          <span className="text-sm text-zinc-500">€</span>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs text-zinc-500">
          Délai de paiement de l&apos;acompte
        </label>
        <p className="mb-2 text-xs text-zinc-500">
          Passé ce délai, le lien de paiement expire et le créneau est
          libéré.
        </p>
        <select
          value={expiryHours}
          onChange={(e) => {
            const next = Number(e.target.value);
            setExpiryHours(next);
            save(type, percentage, fixedAmount, next);
          }}
          style={{ colorScheme: "dark" }}
          className="input-field"
        >
          {EXPIRY_OPTIONS.map((opt) => (
            <option
              key={opt.hours}
              value={opt.hours}
              style={{ backgroundColor: "#18181b", color: "#f4f4f5" }}
            >
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {saved && <p className="mt-2 text-xs text-success">Enregistré</p>}
    </div>
  );
}
