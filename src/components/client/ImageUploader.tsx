"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

const MAX_IMAGES = 3;

interface ImageUploaderProps {
  value: File[];
  onChange: (files: File[]) => void;
}

export function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = value.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [value]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const merged = [...value, ...Array.from(fileList)].slice(0, MAX_IMAGES);
    onChange(merged);
    if (inputRef.current) inputRef.current.value = "";
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
              className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {value.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <ImagePlus size={18} />
            <span className="text-[10px]">Ajouter</span>
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
        {value.length}/{MAX_IMAGES} images · JPG, PNG · 5 Mo max
      </p>
    </div>
  );
}
