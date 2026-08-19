"use client";

import { useState, useTransition } from "react";
import { setDepositDefaults } from "@/app/dashboard/settings/actions";

export function DepositSettings({
  depositType,
  depositPercentage,
  depositFixedAmountCents,
}: {
  depositType: "percentage" | "fixed";
  depositPercentage: number;
  depositFixedAmountCents: number | null;
}) {
  const [type, setType] = useState<"percentage" | "fixed">(depositType);
  const [percentage, setPercentage] = useState(depositPercentage);
  const [fixedAmount, setFixedAmount] = useState(
    depositFixedAmountCents ? depositFixedAmountCents / 100 : 50
  );
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  const save = (
    nextType: "percentage" | "fixed",
    nextPercentage: number,
    nextFixedAmount: number
  ) => {
    setSaved(false);
    startTransition(async () => {
      try {
        await setDepositDefaults({
          depositType: nextType,
          depositPercentage: nextPercentage,
          depositFixedAmountEur: nextFixedAmount,
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
        Se pré-remplit automatiquement quand tu acceptes une demande — tu
        peux toujours l&apos;ajuster au cas par cas.
      </p>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setType("percentage");
            save("percentage", percentage, fixedAmount);
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
            save("fixed", percentage, fixedAmount);
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
        <div>
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
            onMouseUp={() => save("percentage", percentage, fixedAmount)}
            onTouchEnd={() => save("percentage", percentage, fixedAmount)}
            className="w-full accent-accent"
          />
          <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
            <span>5%</span>
            <span>50%</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={fixedAmount}
            onChange={(e) => setFixedAmount(Number(e.target.value))}
            onBlur={() => save("fixed", percentage, fixedAmount)}
            className="input-field w-28"
          />
          <span className="text-sm text-zinc-500">€</span>
        </div>
      )}

      {saved && <p className="mt-2 text-xs text-success">Enregistré</p>}
    </div>
  );
}
