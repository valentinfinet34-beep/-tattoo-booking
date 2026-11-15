"use client";

import { useRef, useState } from "react";
import {
  resetAvatar,
  updateProfile,
  uploadAvatar,
} from "@/app/dashboard/settings/actions";
import {
  UNSUPPORTED_IMAGE_MESSAGE,
  UnsupportedImageError,
  prepareImage,
} from "@/lib/image-resize";

export function ProfileSettings({
  avatarUrl,
  displayName,
  city,
  bio,
  instagramHandle,
}: {
  avatarUrl: string | null;
  displayName: string;
  city: string;
  bio: string;
  instagramHandle: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [name, setName] = useState(displayName);
  const [cityValue, setCityValue] = useState(city);
  const [bioValue, setBioValue] = useState(bio);
  const [instagram, setInstagram] = useState(instagramHandle);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    const before = preview;

    try {
      // Recadrée en carré et allégée : une photo de téléphone passe sans souci.
      const photo = await prepareImage(file, {
        maxSide: 512,
        square: true,
        maxBytes: 400_000,
      });
      setPreview(URL.createObjectURL(photo));

      const formData = new FormData();
      formData.append("avatar", photo);

      const result = await uploadAvatar(formData);
      if (!result.ok) {
        setError(result.message);
        setPreview(before);
        return;
      }
      setPreview(result.url);
    } catch (err) {
      setPreview(before);
      setError(
        err instanceof UnsupportedImageError
          ? UNSUPPORTED_IMAGE_MESSAGE
          : "Échec de l’envoi de la photo. Réessaie dans un instant."
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
      await resetAvatar();
      setPreview(null);
    } catch {
      setError("Échec de la réinitialisation, réessaie.");
    } finally {
      setResetting(false);
    }
  };

  const saveProfile = async () => {
    setError(null);
    try {
      await updateProfile({
        displayName: name,
        city: cityValue,
        bio: bioValue,
        instagramHandle: instagram,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Échec de l'enregistrement.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-zinc-800 bg-zinc-900">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Photo de profil"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-600">
              Aucune photo
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
              {uploading
                ? "Envoi..."
                : preview
                  ? "Changer la photo"
                  : "Ajouter ma photo"}
            </button>
            {preview && (
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting || uploading}
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-100"
              >
                {resetting ? "..." : "Retirer"}
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
            Une photo de toi : tes clients voient à qui ils parlent. Elle est
            recadrée en carré automatiquement.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">
            Nom / pseudo
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveProfile}
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Ville</label>
          <input
            value={cityValue}
            onChange={(e) => setCityValue(e.target.value)}
            onBlur={saveProfile}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-zinc-500">
          Description courte (affichée sur ta page publique)
        </label>
        <textarea
          rows={2}
          value={bioValue}
          onChange={(e) => setBioValue(e.target.value)}
          onBlur={saveProfile}
          className="input-field resize-none"
          placeholder="Spécialiste réalisme noir et gris depuis 8 ans..."
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-zinc-500">
          Lien ou pseudo Instagram
        </label>
        <input
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          onBlur={saveProfile}
          placeholder="@tonpseudo"
          className="input-field"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {saved && <p className="text-xs text-success">Enregistré</p>}
    </div>
  );
}
