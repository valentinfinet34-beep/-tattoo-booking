"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BODY_LOCATIONS,
  COLOR_MODES,
  SIZE_CATEGORIES,
  STYLES,
} from "@/lib/validations/tattooRequest.schema";
import { DURATION_OPTIONS } from "@/lib/scheduling";
import { DatePicker } from "@/components/client/DatePicker";
import { TimeSlotPicker } from "@/components/client/TimeSlotPicker";

const optionStyle = { backgroundColor: "#18181b", color: "#f4f4f5" };

export function NewProjectForm({
  artistSlug,
  blockedDates,
}: {
  artistSlug: string;
  blockedDates: string[];
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [bodyLocation, setBodyLocation] = useState<
    (typeof BODY_LOCATIONS)[number]
  >(BODY_LOCATIONS[0]);
  const [sizeCategory, setSizeCategory] = useState<
    (typeof SIZE_CATEGORIES)[number]
  >(SIZE_CATEGORIES[0]);
  const [style, setStyle] = useState<(typeof STYLES)[number]>(STYLES[0]);
  const [colorMode, setColorMode] = useState<(typeof COLOR_MODES)[number]>(
    COLOR_MODES[0]
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationHours, setDurationHours] = useState<number>(2);
  const [amount, setAmount] = useState("50");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    if (!date || !time) {
      setError("Choisis une date et un horaire.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/projects/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone,
        description,
        bodyLocation,
        sizeCategory,
        style,
        colorMode,
        preferredDate: date,
        preferredTime: time,
        durationHours,
        depositAmountEur: Number(amount),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        typeof body?.error === "string"
          ? body.error
          : "Échec de la création. Vérifie les champs."
      );
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-900/80 p-5 shadow-2xl backdrop-blur-md transition-all hover:border-red-500/40">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="input-field"
          />
        </Field>
        <Field label="Nom">
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="input-field"
          />
        </Field>
      </div>

      <Field label="Email (pour le lien de paiement)">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
        />
      </Field>

      <Field label="Téléphone">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input-field"
        />
      </Field>

      <Field label="Description du projet">
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-field resize-none"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Zone du corps">
          <select
            value={bodyLocation}
            onChange={(e) =>
              setBodyLocation(e.target.value as (typeof BODY_LOCATIONS)[number])
            }
            style={{ colorScheme: "dark" }}
            className="input-field"
          >
            {BODY_LOCATIONS.map((loc) => (
              <option key={loc} value={loc} style={optionStyle}>
                {loc}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Taille approximative">
          <select
            value={sizeCategory}
            onChange={(e) =>
              setSizeCategory(e.target.value as (typeof SIZE_CATEGORIES)[number])
            }
            style={{ colorScheme: "dark" }}
            className="input-field"
          >
            {SIZE_CATEGORIES.map((size) => (
              <option key={size} value={size} style={optionStyle}>
                {size}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Style souhaité">
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as (typeof STYLES)[number])}
            style={{ colorScheme: "dark" }}
            className="input-field"
          >
            {STYLES.map((s) => (
              <option key={s} value={s} style={optionStyle}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Couleur">
          <select
            value={colorMode}
            onChange={(e) =>
              setColorMode(e.target.value as (typeof COLOR_MODES)[number])
            }
            style={{ colorScheme: "dark" }}
            className="input-field"
          >
            {COLOR_MODES.map((mode) => (
              <option key={mode} value={mode} style={optionStyle}>
                {mode}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Date du RDV">
        <DatePicker value={date} onChange={setDate} blockedDates={blockedDates} />
      </Field>

      <Field label="Heure du RDV">
        <TimeSlotPicker
          date={date}
          value={time}
          onChange={setTime}
          artistSlug={artistSlug}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Durée estimée">
          <select
            value={durationHours}
            onChange={(e) => setDurationHours(Number(e.target.value))}
            style={{ colorScheme: "dark" }}
            className="input-field"
          >
            {DURATION_OPTIONS.map((h) => (
              <option key={h} value={h} style={optionStyle}>
                {h} h
              </option>
            ))}
          </select>
        </Field>
        <Field label="Montant de l'acompte (€)">
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-field"
          />
        </Field>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading ? "Création..." : "Créer et envoyer le lien de paiement"}
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-500">{label}</label>
      {children}
    </div>
  );
}
