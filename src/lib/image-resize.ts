/**
 * Réduit une photo DANS LE NAVIGATEUR avant de l'envoyer.
 *
 * Pourquoi : une photo de téléphone pèse souvent 2 à 8 Mo, alors que le site
 * refuse les envois de plus de 1 Mo vers ses actions (et 4,5 Mo vers ses
 * routes). Sans réduction, l'envoi échoue. La photo est donc redimensionnée
 * et enregistrée en JPEG léger ; pour une photo de profil, elle est aussi
 * recadrée en carré, centrée.
 *
 * À n'utiliser que côté navigateur (composants "use client").
 */

export class UnsupportedImageError extends Error {
  constructor() {
    super("Format d'image non pris en charge");
    this.name = "UnsupportedImageError";
  }
}

export const UNSUPPORTED_IMAGE_MESSAGE =
  "Cette photo n'a pas pu être lue. Choisis une photo au format JPG ou PNG.";

type Decoded = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // On retente avec une balise image classique (certains navigateurs).
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new UnsupportedImageError());
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new UnsupportedImageError();
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new UnsupportedImageError();
  }
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/** Dimensions finales et zone de la photo d'origine à garder. */
export function computeTarget(
  width: number,
  height: number,
  options: { maxSide: number; square?: boolean }
) {
  if (options.square) {
    const side = Math.min(width, height);
    const size = Math.max(1, Math.min(options.maxSide, side));
    return {
      sx: Math.round((width - side) / 2),
      sy: Math.round((height - side) / 2),
      sw: side,
      sh: side,
      width: size,
      height: size,
    };
  }

  const scale = Math.min(1, options.maxSide / Math.max(width, height));
  return {
    sx: 0,
    sy: 0,
    sw: width,
    sh: height,
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function prepareImage(
  file: File,
  options: { maxSide: number; square?: boolean; maxBytes?: number }
): Promise<File> {
  const maxBytes = options.maxBytes ?? 900_000;
  const decoded = await decode(file);

  try {
    let maxSide = options.maxSide;

    // Jusqu'à 4 tailles de plus en plus petites, chacune avec plusieurs
    // niveaux de compression, jusqu'à passer sous le poids autorisé.
    for (let attempt = 0; attempt < 4; attempt++) {
      const target = computeTarget(decoded.width, decoded.height, {
        maxSide,
        square: options.square,
      });

      const canvas = document.createElement("canvas");
      canvas.width = target.width;
      canvas.height = target.height;
      const context = canvas.getContext("2d");
      if (!context) throw new UnsupportedImageError();

      // Fond blanc : une image transparente (PNG) ne devient pas noire.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, target.width, target.height);
      context.drawImage(
        decoded.source,
        target.sx,
        target.sy,
        target.sw,
        target.sh,
        0,
        0,
        target.width,
        target.height
      );

      for (const quality of [0.86, 0.76, 0.66, 0.56]) {
        const blob = await toJpeg(canvas, quality);
        if (!blob) throw new UnsupportedImageError();
        if (blob.size <= maxBytes) {
          const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
          return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
        }
      }

      maxSide = Math.round(maxSide * 0.75);
    }

    throw new UnsupportedImageError();
  } finally {
    decoded.release();
  }
}
