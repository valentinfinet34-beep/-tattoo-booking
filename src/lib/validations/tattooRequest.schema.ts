import { z } from "zod";

export const BODY_LOCATIONS = [
  "Avant-bras",
  "Bras",
  "Épaule",
  "Dos",
  "Torse",
  "Jambe",
  "Cheville",
  "Main",
  "Cou",
  "Côtes",
  "Autre",
] as const;

export const TIME_SLOTS = ["Matin", "Après-midi", "Soirée", "Peu importe"] as const;

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
  sizeCm: z
    .number({ message: "Taille invalide" })
    .positive("Taille invalide")
    .max(100, "100 cm maximum"),
  preferredDate: z.string().min(1, "Choisis une date"),
  timeSlot: z.enum(TIME_SLOTS),
  images: z
    .array(
      z
        .instanceof(File)
        .refine(
          (file) => file.size <= MAX_IMAGE_SIZE_MB * 1024 * 1024,
          `Chaque image doit faire moins de ${MAX_IMAGE_SIZE_MB} Mo`
        )
    )
    .min(1, "Ajoute au moins une image d'inspiration")
    .max(MAX_IMAGES, `${MAX_IMAGES} images maximum`),
});

export type TattooRequestInput = z.infer<typeof tattooRequestSchema>;
