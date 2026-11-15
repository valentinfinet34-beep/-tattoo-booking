"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  COLOR_MODES,
  SIZE_CATEGORIES,
} from "@/lib/validations/tattooRequest.schema";
import {
  BODY_LOCATION_GROUPS,
  DETAIL_MAX_LENGTH,
  LETTERING,
  LETTERING_STYLES,
  OTHER,
  STYLE_GROUPS,
  cleanDetail,
  itemLabel,
} from "@/lib/tattoo-catalog";
import { CatalogPicker } from "@/components/CatalogPicker";
import { DURATION_OPTIONS } from "@/lib/scheduling";
import { DatePicker } from "@/components/client/DatePicker";
import { TimeSlotPicker } from "@/components/client/TimeSlotPicker";

const optionStyle = { backgroundColor: "#18181b", color: "#f4f4f5" };

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

export function NewProjectForm({
  artistSlug,
  blockedDates,
  depositDefaults,
}: {
  artistSlug: string;
  blockedDates: string[];
  depositDefaults?: DepositDefaults;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [bodyLocation, setBodyLocation] = useState("");
  const [bodyLocationDetail, setBodyLocationDetail] = useState("");
  const [sizeCategory, setSizeCategory] = useState<
    (typeof SIZE_CATEGORIES)[number]
  >(SIZE_CATEGORIES[0]);
  const [style, setStyle] = useState("");
  const [styleDetail, setStyleDetail] = useState("");
  const [letteringStyle, setLetteringStyle] = useState("");
  const [colorMode, setColorMode] = useState<(typeof COLOR_MODES)[number]>(
    COLOR_MODES[0]
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationHours, setDurationHours] = useState<number>(2);
  const [totalPrice, setTotalPrice] = useState("");
  const [amount, setAmount] = useState(() =>
    computeDefaultAmount(depositDefaults, "")
  );
  const [amountTouched, setAmountTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLettering = style === LETTERING;
  const needsStyleDetail =
    style === OTHER || (isLettering && letteringStyle === OTHER);

  const handleSubmit = async () => {
    setError(null);

    if (!bodyLocation || !style) {
      setError("Choisis une zone du corps et un style.");
      return;
    }
    if (bodyLocation === OTHER && !cleanDetail(bodyLocationDetail)) {
      setError("Précise la zone du corps.");
      return;
    }
    if (isLettering && !letteringStyle) {
      setError("Choisis un style d’écriture.");
      return;
    }
    if (needsStyleDetail && !cleanDetail(styleDetail)) {
      setError(isLettering ? "Précise le style d’écriture." : "Précise le style.");
      return;
    }

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
        bodyLocationDetail,
        sizeCategory,
        style,
        styleDetail,
        letteringStyle,
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

      <Field label="Zone du corps">
        <CatalogPicker
          title="Zone du corps"
          groups={BODY_LOCATION_GROUPS}
          placeholder="Choisis une zone"
          searchPlaceholder="Rechercher une zone"
          value={bodyLocation}
          onChange={setBodyLocation}
        />
      </Field>

      <Field
        label={
          bodyLocation === OTHER
            ? "Précise la zone du corps"
            : "Précision sur l’emplacement (optionnel)"
        }
      >
        <input
          value={bodyLocationDetail}
          maxLength={DETAIL_MAX_LENGTH}
          onChange={(e) => setBodyLocationDetail(e.target.value)}
          placeholder="Ex. côté gauche, face intérieure…"
          className="input-field"
        />
      </Field>

      <Field label="Style souhaité">
        <CatalogPicker
          title="Style souhaité"
          groups={STYLE_GROUPS}
          placeholder="Choisis un style"
          searchPlaceholder="Rechercher un style"
          value={style}
          onChange={setStyle}
        />
      </Field>

      {isLettering && (
        <Field label="Style d’écriture">
          <select
            value={letteringStyle}
            onChange={(e) => setLetteringStyle(e.target.value)}
            style={{ colorScheme: "dark" }}
            className="input-field"
          >
            <option value="" style={optionStyle}>
              Choisis un style d&apos;écriture
            </option>
            {LETTERING_STYLES.map((item) => (
              <option key={item.value} value={item.value} style={optionStyle}>
                {itemLabel(item)}
              </option>
            ))}
          </select>
        </Field>
      )}

      {needsStyleDetail && (
        <Field label={isLettering ? "Précise le style d’écriture" : "Précise le style"}>
          <input
            value={styleDetail}
            maxLength={DETAIL_MAX_LENGTH}
            onChange={(e) => setStyleDetail(e.target.value)}
            className="input-field"
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
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
          ignoreWorkingDays
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
        {depositDefaults?.depositType === "percentage" ? (
          <Field label="Prix total estimé (€)">
            <input
              type="number"
              min={1}
              value={totalPrice}
              onChange={(e) => {
                const value = e.target.value;
                setTotalPrice(value);
                if (!amountTouched) {
                  setAmount(computeDefaultAmount(depositDefaults, value));
                }
              }}
              placeholder={`Ex: 200 → acompte ${depositDefaults.depositPercentage}% auto`}
              className="input-field"
            />
          </Field>
        ) : (
          <div />
        )}
      </div>

      <Field label="Montant de l'acompte (€)">
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => {
            setAmountTouched(true);
            setAmount(e.target.value);
          }}
          className="input-field"
        />
      </Field>

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
