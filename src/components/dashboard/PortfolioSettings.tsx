"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import {
  removePortfolioImage,
  uploadPortfolioImage,
} from "@/app/dashboard/settings/actions";

const MAX_IMAGES = 4;

export function PortfolioSettings({
  initialImages,
}: {
  initialImages: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("photo", file);

    try {
      await uploadPortfolioImage(formData);
      setImages((prev) => [...prev, URL.createObjectURL(file)]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de l'upload, réessaie."
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async (url: string) => {
    setError(null);
    setImages((prev) => prev.filter((u) => u !== url));
    try {
      await removePortfolioImage(url);
    } catch {
      setError("Échec de la suppression, réessaie.");
      setImages((prev) => [...prev, url]);
    }
  };

  return (
    <div>
      <h2 className="mb-1 font-display text-lg tracking-wide text-zinc-100">
        Galerie de réalisations
      </h2>
      <p className="mb-3 text-xs text-zinc-500">
        3 à 4 photos de tes tatouages, affichées en haut de ta page de
        réservation pour donner confiance aux clients.
      </p>
      <div className="grid grid-cols-4 gap-2">
        {images.map((url) => (
          <div
            key={url}
            className="group relative aspect-square overflow-hidden rounded-md border border-zinc-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Réalisation"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemove(url)}
              aria-label="Retirer cette photo"
              className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-zinc-700 text-zinc-500 transition-colors hover:border-accent hover:text-accent"
          >
            <span className="text-[10px]">
              {uploading ? "Envoi..." : "Ajouter"}
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
