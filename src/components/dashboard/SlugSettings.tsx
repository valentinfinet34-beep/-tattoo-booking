"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { changeSlug } from "@/app/dashboard/settings/actions";
import {
  SLUG_HISTORY_DAYS,
  SLUG_MAX_LENGTH,
  bookingPath,
  normalizeSlugInput,
} from "@/lib/slug";

type Check = {
  slug: string;
  available: boolean;
  failed?: boolean;
  message?: string;
  suggestions: string[];
};

export function SlugSettings({
  currentSlug,
  siteUrl,
}: {
  currentSlug: string;
  siteUrl: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentSlug);
  const [check, setCheck] = useState<Check | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newLink, setNewLink] = useState<string | null>(null);

  const unchanged = value === currentSlug;

  // Vérification en direct, 350 ms après la dernière frappe.
  useEffect(() => {
    if (!value || value === currentSlug) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/check-slug?slug=${encodeURIComponent(value)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setCheck({
          slug: value,
          available: Boolean(data.available),
          message: data.message,
          suggestions: data.suggestions ?? [],
        });
      } catch {
        if (controller.signal.aborted) return;
        setCheck({ slug: value, available: false, failed: true, suggestions: [] });
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, currentSlug]);

  const currentCheck = check && check.slug === value ? check : null;
  const state =
    unchanged || !value
      ? "idle"
      : !currentCheck
        ? "checking"
        : currentCheck.failed
          ? "failed"
          : currentCheck.available
            ? "available"
            : "unavailable";

  const oldLink = `${siteUrl}${bookingPath(currentSlug)}`;
  const nextLink = `${siteUrl}${bookingPath(value)}`;

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await changeSlug(value);
      if (!result.ok) {
        setError(result.message);
        setCheck({
          slug: value,
          available: false,
          message: result.message,
          suggestions: result.suggestions,
        });
        return;
      }
      setNewLink(`${siteUrl}${bookingPath(result.slug)}`);
      router.refresh();
    } catch {
      setError("Impossible de changer ton lien, réessaie dans un instant.");
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-xs text-zinc-500">
          Ton lien actuel — celui à mettre en bio Instagram
        </p>
        <code className="block break-all rounded-md bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
          {oldLink}
        </code>
      </div>

      <div>
        <label htmlFor="new-slug" className="mb-1 block text-xs text-zinc-500">
          Nouveau lien
        </label>
        <div className="input-field flex items-center gap-1 text-sm text-zinc-500">
          <span>/book/</span>
          <input
            id="new-slug"
            value={value}
            maxLength={SLUG_MAX_LENGTH}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => {
              setConfirming(false);
              setNewLink(null);
              setError(null);
              setValue(normalizeSlugInput(e.target.value));
            }}
            onBlur={() => setValue((v) => v.replace(/-+$/, ""))}
            className="w-full bg-transparent text-zinc-100 outline-none"
          />
        </div>

        {state === "checking" && (
          <p className="mt-1.5 text-xs text-zinc-500">Vérification…</p>
        )}
        {state === "available" && (
          <p className="mt-1.5 break-all text-xs text-success">
            ✓ Disponible : {nextLink}
          </p>
        )}
        {state === "failed" && (
          <p className="mt-1.5 text-xs text-red-400">
            Impossible de vérifier pour le moment, réessaie dans un instant.
          </p>
        )}
        {state === "unavailable" && currentCheck && (
          <div className="mt-1.5">
            <p className="text-xs text-red-400">{currentCheck.message}</p>
            {currentCheck.suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-500">Essaie plutôt :</span>
                {currentCheck.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setValue(suggestion)}
                    className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-100 transition-colors hover:border-accent"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!confirming && !newLink && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={state !== "available"}
          className="btn-secondary w-full text-sm sm:w-auto"
        >
          Changer mon lien
        </button>
      )}

      {confirming && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-zinc-200">
          <p className="mb-2 font-medium text-amber-300">
            Attention : ton ancien lien va cesser de marcher
          </p>
          <p className="mb-3 text-xs leading-relaxed text-zinc-300">
            Ton lien actuel, <strong className="break-all">{oldLink}</strong>{" "}
            (celui de ta bio Instagram), ne sera plus ton lien officiel.
            Pendant {SLUG_HISTORY_DAYS} jours il redirigera encore tes clients
            vers le nouveau ; ensuite il affichera une page « introuvable ».
            Pense à mettre à jour ta bio Instagram et tous les endroits où tu
            as partagé ce lien.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="btn-primary text-sm"
            >
              {saving ? "Changement..." : "Oui, changer mon lien"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={saving}
              className="btn-secondary text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {newLink && (
        <div className="rounded-xl border border-success/40 bg-success/10 p-4 text-xs leading-relaxed text-zinc-200">
          <p className="mb-1 font-medium text-success">C&apos;est fait !</p>
          <p>
            Ton nouveau lien : <strong className="break-all">{newLink}</strong>
          </p>
          <p className="mt-1 text-zinc-400">
            L&apos;ancien redirige encore pendant {SLUG_HISTORY_DAYS} jours.
            Mets ta bio Instagram à jour dès maintenant.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
