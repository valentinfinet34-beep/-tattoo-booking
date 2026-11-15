"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { prepareImage } from "@/lib/image-resize";

const MAX_IMAGES = 3;
// Une photo qu’on n’arrive pas à réduire n’est gardée telle quelle que si elle
// est déjà légère : sinon l’envoi du formulaire serait refusé.
const MAX_UNTOUCHED_BYTES = 1_000_000;

interface ImageUploaderProps {
  value: File[];
  onChange: (files: File[]) => void;
}

export function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urls = value.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [value]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const picked = Array.from(fileList).slice(0, MAX_IMAGES - value.length);
    if (inputRef.current) inputRef.current.value = "";
    if (picked.length === 0) return;

    setError(null);
    setPreparing(true);

    // Les photos de téléphone sont lourdes : on les allège avant l’envoi.
    const ready: File[] = [];
    let unreadable = 0;
    for (const file of picked) {
      try {
        ready.push(await prepareImage(file, { maxSide: 1600, maxBytes: 900_000 }));
      } catch {
        if (file.type.startsWith("image/") && file.size <= MAX_UNTOUCHED_BYTES) {
          ready.push(file);
        } else {
          unreadable += 1;
        }
      }
    }

    setPreparing(false);
    if (unreadable > 0) {
      setError(
        unreadable === 1
          ? "Une photo n’a pas pu être lue. Choisis une photo au format JPG ou PNG."
          : "Certaines photos n’ont pas pu être lues. Choisis des photos au format JPG ou PNG."
      );
    }
    if (ready.length > 0) onChange([...value, ...ready].slice(0, MAX_IMAGES));
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {value.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="group relative aspect-square overflow-hidden rounded-md border border-border"
          >
            {previews[index] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previews[index]}
                alt={`Inspiration ${index + 1}`}
                className="h-full w-full object-cover"
              />
            )}
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label="Retirer cette image"
              className="absolute right-1 top-1 rounded-full bg-black/70 p-1.5 text-white transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {value.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={preparing}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <ImagePlus size={18} />
            <span className="text-[10px]">{preparing ? "Un instant…" : "Ajouter"}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="text-[11px] text-muted">
        {value.length}/{MAX_IMAGES} images · JPG ou PNG · allégées automatiquement
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
