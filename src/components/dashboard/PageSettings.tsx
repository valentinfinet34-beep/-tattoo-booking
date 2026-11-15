"use client";

import { useRef, useState, useTransition } from "react";
import { ACCENT_PRESETS, type AccentColorKey } from "@/lib/theme-presets";
import { X } from "lucide-react";
import {
  PRACTICE_STYLE_GROUPS,
  sanitizePracticedStyles,
} from "@/lib/tattoo-catalog";
import { CatalogMultiPicker } from "@/components/CatalogPicker";
import {
  resetCoverImage,
  setAccentColor,
  updatePracticedStyles,
  updateWelcomeMessage,
  uploadCoverImage,
} from "@/app/dashboard/settings/actions";
import {
  UNSUPPORTED_IMAGE_MESSAGE,
  UnsupportedImageError,
  prepareImage,
} from "@/lib/image-resize";

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
  const [styles, setStyles] = useState<string[]>(() =>
    sanitizePracticedStyles(practicedStyles)
  );
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

  const saveStyles = (next: string[]) => {
    setStyles(next);

    startTransition(async () => {
      try {
        await updatePracticedStyles(next);
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
    const before = preview;

    try {
      const photo = await prepareImage(file, { maxSide: 1920, maxBytes: 900_000 });
      setPreview(URL.createObjectURL(photo));

      const formData = new FormData();
      formData.append("cover", photo);
      await uploadCoverImage(formData);
    } catch (err) {
      setPreview(before);
      setError(
        err instanceof UnsupportedImageError
          ? UNSUPPORTED_IMAGE_MESSAGE
          : "Échec de l’envoi de la photo, réessaie."
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
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
        <p className="mb-3 text-xs leading-relaxed text-zinc-500">
          Coche les styles que tu pratiques : seuls ceux-là seront proposés à
          tes clients (avec « Je ne sais pas encore » et « Autre », pour que
          personne ne reste bloqué). Aucune sélection = tous les styles
          proposés.
        </p>
        {styles.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-2">
            {styles.map((style) => (
              <li key={style}>
                <button
                  type="button"
                  onClick={() => saveStyles(styles.filter((s) => s !== style))}
                  aria-label={`Retirer ${style}`}
                  className="flex items-center gap-1.5 rounded-full border border-accent bg-accent/10 px-3 py-1.5 text-xs text-accent"
                >
                  {style}
                  <X size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <CatalogMultiPicker
          title="Styles pratiqués"
          groups={PRACTICE_STYLE_GROUPS}
          searchPlaceholder="Rechercher un style"
          values={styles}
          onChange={saveStyles}
          buttonLabel={
            styles.length > 0
              ? `Modifier mes styles (${styles.length})`
              : "Choisir mes styles"
          }
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
