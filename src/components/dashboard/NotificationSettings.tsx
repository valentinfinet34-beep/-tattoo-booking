"use client";

import { useState, useTransition } from "react";
import { updateNotificationPrefs } from "@/app/dashboard/settings/actions";

type Prefs = {
  notifyNewRequest: boolean;
  notifyQuoteAccepted: boolean;
  notifyDepositPaid: boolean;
  notifyReminder24h: boolean;
};

const OPTIONS: { key: keyof Prefs; label: string }[] = [
  { key: "notifyNewRequest", label: "Nouvelle demande reçue" },
  { key: "notifyQuoteAccepted", label: "Client accepte le devis" },
  { key: "notifyDepositPaid", label: "Acompte payé" },
  { key: "notifyReminder24h", label: "Rappel 24h avant un rendez-vous" },
];

export function NotificationSettings({
  notifyNewRequest,
  notifyQuoteAccepted,
  notifyDepositPaid,
  notifyReminder24h,
}: Prefs) {
  const [prefs, setPrefs] = useState<Prefs>({
    notifyNewRequest,
    notifyQuoteAccepted,
    notifyDepositPaid,
    notifyReminder24h,
  });
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  const toggle = (key: keyof Prefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateNotificationPrefs(next);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        setPrefs(prefs);
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {OPTIONS.map(({ key, label }) => (
        <label
          key={key}
          className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 px-3 py-2.5"
        >
          <span className="text-sm text-zinc-300">{label}</span>
          <input
            type="checkbox"
            checked={prefs[key]}
            onChange={() => toggle(key)}
            className="h-4 w-4 accent-accent"
          />
        </label>
      ))}
      {saved && <p className="text-xs text-success">Enregistré</p>}
    </div>
  );
}
