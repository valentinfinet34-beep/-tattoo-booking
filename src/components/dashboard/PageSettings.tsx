"use client";

import { useRef, useState, useTransition } from "react";
import { ACCENT_PRESETS, type AccentColorKey } from "@/lib/theme-presets";
import { STYLES } from "@/lib/validations/tattooRequest.schema";
import {
  resetCoverImage,
  setAccentColor,
  updatePracticedStyles,
  updateWelcomeMessage,
  uploadCoverImage,
} from "@/app/dashboard/settings/actions";

export function PageSettings({
  coverImageUrl,
  accentColor,
  welcomeMessage,
  practicedStyles,
}: {
  coverImageUrl: string | null;
  accentColor: AccentColorKey;
  welcomeMessage: string;
  practicedStyles: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(coverImageUrl);
  const [selectedColor, setSelectedColor] = useState(accentColor);
  const [message, setMessage] = useState(welcomeMessage);
  const [styles, setStyles] = useState<Set<string>>(new Set(practicedStyles));
  const [uploading, setUploading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const saveMessage = () => {
    startTransition(async () => {
      try {
        await updateWelcomeMessage(message);
      } catch {
        setError("Échec de la mise à jour du message.");
      }
    });
  };

  const toggleStyle = (style: string) => {
    const next = new Set(styles);
    if (next.has(style)) next.delete(style);
    else next.add(style);
    setStyles(next);

    startTransition(async () => {
      try {
        await updatePracticedStyles(Array.from(next));
      } catch {
        setError("Échec de la mise à jour des styles.");
      }
    });
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    setPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("cover", file);

    try {
      await uploadCoverImage(formData);
    } catch {
      setError("Échec de l'upload, réessaie.");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    setResetting(true);
    try {
      await resetCoverImage();
      setPreview(null);
    } catch {
      setError("Échec de la réinitialisation, réessaie.");
    } finally {
      setResetting(false);
    }
  };

  const handleColorSelect = (key: AccentColorKey) => {
    setSelectedColor(key);
    startTransition(async () => {
      try {
        await setAccentColor(key);
      } catch {
        setError("Échec de la mise à jour de la couleur.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="mb-3 font-display text-lg tracking-wide text-zinc-100">
          Photo de fond
        </h2>
        <div className="flex items-center gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-zinc-800">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Aperçu"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-center text-[10px] text-zinc-600">
                Photo par défaut
              </div>
            )}
          </div>
          <div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="btn-secondary text-sm"
              >
                {uploading ? "Envoi..." : "Changer la photo"}
              </button>
              {preview && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={resetting || uploading}
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-100"
                >
                  {resetting ? "..." : "Réinitialiser"}
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">
              JPG ou PNG, format portrait recommandé.
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg tracking-wide text-zinc-100">
          Couleur d&apos;accent
        </h2>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(ACCENT_PRESETS) as AccentColorKey[]).map((key) => {
            const preset = ACCENT_PRESETS[key];
            const active = selectedColor === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleColorSelect(key)}
                aria-label={preset.label}
                className={`h-10 w-10 rounded-full border-2 transition-all ${
                  active ? "scale-110 border-zinc-100" : "border-transparent"
                }`}
                style={{ backgroundColor: preset.base }}
              />
            );
          })}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {ACCENT_PRESETS[selectedColor].label}
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg tracking-wide text-zinc-100">
          Message d&apos;accueil
        </h2>
        <textarea
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onBlur={saveMessage}
          placeholder="Bienvenue ! Décris-moi ton projet en quelques mots..."
          className="input-field resize-none"
        />
      </div>

      <div>
        <h2 className="mb-1 font-display text-lg tracking-wide text-zinc-100">
          Styles pratiqués
        </h2>
        <p className="mb-3 text-xs text-zinc-500">
          Seuls ces styles seront proposés aux clients sur ta page — évite
          les demandes hors sujet. Aucune sélection = tous les styles
          proposés.
        </p>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((style) => {
            const active = styles.has(style);
            return (
              <button
                key={style}
                type="button"
                onClick={() => toggleStyle(style)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-zinc-800 text-zinc-500 hover:text-zinc-100"
                }`}
              >
                {style}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
