"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createSalon,
  createSalonInvite,
  deleteSalon,
  leaveSalon,
  removeSalonMember,
  updateSalon,
  type SalonResult,
} from "@/app/dashboard/settings/salon-actions";
import {
  SALON_BIO_MAX,
  SALON_CITY_MAX,
  SALON_NAME_MAX,
  salonPath,
  type MySalon,
} from "@/lib/salon";
import { SLUG_MAX_LENGTH, normalizeSlugInput, slugify } from "@/lib/slug";

export function SalonSettings({
  salon,
  siteUrl,
}: {
  salon: MySalon | null;
  siteUrl: string;
}) {
  return salon ? (
    <SalonManager salon={salon} siteUrl={siteUrl} />
  ) : (
    <CreateSalon siteUrl={siteUrl} />
  );
}

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const run = async (
    action: () => Promise<SalonResult>,
    success?: string
  ): Promise<boolean> => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.message);
        return false;
      }
      if (success) setDone(success);
      router.refresh();
      return true;
    } catch {
      setError("Une erreur est survenue, réessaie dans un instant.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, done, run, setError, setDone };
}

function CreateSalon({ siteUrl }: { siteUrl: string }) {
  const { busy, error, run } = useAction();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [city, setCity] = useState("");

  const effectiveSlug = slugTouched ? slug : slugify(name);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-zinc-400">
        Tu travailles dans un salon avec d&apos;autres tatoueurs ? Crée une page
        commune : ton client choisit son tatoueur, puis réserve directement
        avec lui. Chacun garde ses propres demandes, son agenda et son
        encaissement : personne ne voit les demandes des autres.
      </p>
      <p className="text-xs leading-relaxed text-zinc-500">
        Tu as reçu une invitation ? Ouvre simplement le lien que le salon t&apos;a
        envoyé.
      </p>

      <div>
        <label htmlFor="salon-name" className="mb-1 block text-xs text-zinc-500">
          Nom du salon
        </label>
        <input
          id="salon-name"
          value={name}
          maxLength={SALON_NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="Studio Noir"
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="salon-slug" className="mb-1 block text-xs text-zinc-500">
          Lien du salon
        </label>
        <div className="input-field flex items-center gap-1 text-sm text-zinc-500">
          <span>/salon/</span>
          <input
            id="salon-slug"
            value={effectiveSlug}
            maxLength={SLUG_MAX_LENGTH}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(normalizeSlugInput(e.target.value));
            }}
            className="w-full bg-transparent text-zinc-100 outline-none"
          />
        </div>
        <p className="mt-1.5 break-all text-xs text-zinc-500">
          {siteUrl}
          {salonPath(effectiveSlug || "ton-salon")} — ce lien ne pourra pas être
          modifié ensuite.
        </p>
      </div>

      <div>
        <label htmlFor="salon-city" className="mb-1 block text-xs text-zinc-500">
          Ville (facultatif)
        </label>
        <input
          id="salon-city"
          value={city}
          maxLength={SALON_CITY_MAX}
          onChange={(e) => setCity(e.target.value)}
          className="input-field"
        />
      </div>

      <button
        type="button"
        disabled={busy || !name.trim() || !effectiveSlug}
        onClick={() => run(() => createSalon({ name, slug: effectiveSlug, city }))}
        className="btn-primary w-full text-sm sm:w-auto"
      >
        {busy ? "Création..." : "Créer mon salon"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function SalonManager({ salon, siteUrl }: { salon: MySalon; siteUrl: string }) {
  const { busy, error, done, run, setError, setDone } = useAction();
  const [name, setName] = useState(salon.name);
  const [city, setCity] = useState(salon.city ?? "");
  const [bio, setBio] = useState(salon.bio ?? "");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "leave" | null>(null);

  const publicLink = `${siteUrl}${salonPath(salon.slug)}`;
  const changed =
    name !== salon.name || city !== (salon.city ?? "") || bio !== (salon.bio ?? "");

  const invite = async () => {
    setError(null);
    setDone(null);
    setCopied(false);
    const result = await createSalonInvite();
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setInviteUrl(result.url);
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1.5 text-xs text-zinc-500">
          Le lien de ton salon — à partager avec tes clients
        </p>
        <code className="block break-all rounded-md bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
          {publicLink}
        </code>
        <p className="mt-1.5 text-xs text-zinc-500">
          Tes clients y choisissent leur tatoueur. Chaque tatoueur garde aussi
          son propre lien de réservation.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-100">
          Tatoueurs du salon ({salon.members.length})
        </p>
        <ul className="flex flex-col gap-2">
          {salon.members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 px-3 py-2"
            >
              <span className="min-w-0 text-sm text-zinc-200">
                <span className="block truncate">{m.displayName}</span>
                {m.isOwner && (
                  <span className="text-xs text-zinc-500">Propriétaire du salon</span>
                )}
              </span>
              {salon.isOwner && !m.isOwner && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Retirer ${m.displayName} du salon ?`)) {
                      run(() => removeSalonMember(m.id), "Tatoueur retiré du salon.");
                    }
                  }}
                  className="shrink-0 text-xs text-red-400 hover:underline"
                >
                  Retirer
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {salon.isOwner && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-zinc-100">Inviter un tatoueur</p>
          <p className="text-xs leading-relaxed text-zinc-500">
            Crée un lien d&apos;invitation et envoie-le à la personne. Il ne
            marche qu&apos;une seule fois et expire au bout de 7 jours. Elle doit
            avoir un compte TattFlow.
          </p>
          <button
            type="button"
            onClick={invite}
            disabled={busy}
            className="btn-secondary w-full text-sm sm:w-auto"
          >
            Créer un lien d&apos;invitation
          </button>
          {inviteUrl && (
            <div className="flex flex-col gap-2">
              <code className="block break-all rounded-md bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
                {inviteUrl}
              </code>
              <button
                type="button"
                onClick={() => copy(inviteUrl)}
                className="btn-secondary w-full text-sm sm:w-auto"
              >
                {copied ? "Lien copié ✓" : "Copier le lien"}
              </button>
            </div>
          )}
        </div>
      )}

      {salon.isOwner && (
        <div className="flex flex-col gap-4 border-t border-zinc-800 pt-5">
          <p className="text-sm font-medium text-zinc-100">Informations du salon</p>
          <div>
            <label htmlFor="salon-edit-name" className="mb-1 block text-xs text-zinc-500">
              Nom du salon
            </label>
            <input
              id="salon-edit-name"
              value={name}
              maxLength={SALON_NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="salon-edit-city" className="mb-1 block text-xs text-zinc-500">
              Ville
            </label>
            <input
              id="salon-edit-city"
              value={city}
              maxLength={SALON_CITY_MAX}
              onChange={(e) => setCity(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="salon-edit-bio" className="mb-1 block text-xs text-zinc-500">
              Présentation
            </label>
            <textarea
              id="salon-edit-bio"
              value={bio}
              maxLength={SALON_BIO_MAX}
              rows={4}
              onChange={(e) => setBio(e.target.value)}
              className="input-field"
            />
          </div>
          <button
            type="button"
            disabled={busy || !changed || !name.trim()}
            onClick={() => run(() => updateSalon({ name, city, bio }), "Enregistré")}
            className="btn-primary w-full text-sm sm:w-auto"
          >
            {busy ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      )}

      <div className="border-t border-zinc-800 pt-5">
        {confirm ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-zinc-300">
              {confirm === "delete"
                ? "Supprimer le salon ? Les tatoueurs ne sont plus regroupés et le lien du salon cesse de fonctionner. Leurs demandes, devis et paiements ne sont pas touchés."
                : "Quitter le salon ? Tes demandes, devis et paiements ne sont pas touchés."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(confirm === "delete" ? deleteSalon : leaveSalon)
                }
                className="btn-secondary w-full text-sm text-red-400 sm:w-auto"
              >
                {confirm === "delete" ? "Oui, supprimer le salon" : "Oui, quitter le salon"}
              </button>
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="btn-secondary w-full text-sm sm:w-auto"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirm(salon.isOwner ? "delete" : "leave")}
            className="text-xs text-red-400 hover:underline"
          >
            {salon.isOwner ? "Supprimer le salon" : "Quitter le salon"}
          </button>
        )}
      </div>

      {done && <p className="text-xs text-success">{done}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
