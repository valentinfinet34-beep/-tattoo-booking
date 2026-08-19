import { z } from "zod";

export const BODY_LOCATIONS = [
  "Bras",
  "Avant-bras",
  "Cheville",
  "Dos",
  "Cou",
  "Poitrine",
  "Cuisse",
  "Mollet",
  "Doigt",
  "Autre",
] as const;

export const SIZE_CATEGORIES = [
  "Petit (< 5 cm)",
  "Moyen (5-15 cm)",
  "Grand (15-30 cm)",
  "Très grand (> 30 cm)",
] as const;

export const STYLES = [
  "Réalisme",
  "Japonais",
  "Old school",
  "Minimaliste",
  "Géométrique",
  "Tribal",
  "Autre",
] as const;

export const COLOR_MODES = ["Couleur", "Noir et gris"] as const;

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE_MB = 5;

export const tattooRequestSchema = z.object({
  firstName: z.string().trim().min(2, "Prénom trop court").max(50),
  lastName: z.string().trim().min(2, "Nom trop court").max(50),
  email: z.string().trim().email("Email invalide"),
  phone: z
    .string()
    .trim()
    .min(10, "Numéro invalide")
    .max(20, "Numéro invalide"),
  description: z
    .string()
    .trim()
    .min(10, "Décris ton projet en quelques mots")
    .max(1000, "1000 caractères maximum"),
  bodyLocation: z.enum(BODY_LOCATIONS),
  sizeCategory: z.enum(SIZE_CATEGORIES),
  style: z.enum(STYLES),
  colorMode: z.enum(COLOR_MODES),
  preferredDate: z.string().min(1, "Choisis une date"),
  preferredTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Choisis un horaire"),
  images: z
    .array(
      z
        .instanceof(File)
        .refine(
          (file) => file.size <= MAX_IMAGE_SIZE_MB * 1024 * 1024,
          `Chaque image doit faire moins de ${MAX_IMAGE_SIZE_MB} Mo`
        )
    )
    .max(MAX_IMAGES, `${MAX_IMAGES} images maximum`),
});

export type TattooRequestInput = z.infer<typeof tattooRequestSchema>;
