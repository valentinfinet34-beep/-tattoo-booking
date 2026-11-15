import { z } from "zod";
import {
  DETAIL_MAX_LENGTH,
  LETTERING,
  OTHER,
  cleanDetail,
  isBodyLocation,
  isLetteringStyle,
  isStyle,
} from "@/lib/tattoo-catalog";

export { BODY_LOCATIONS, STYLES } from "@/lib/tattoo-catalog";

export const SIZE_CATEGORIES = [
  "Petit (< 5 cm)",
  "Moyen (5-15 cm)",
  "Grand (15-30 cm)",
  "Très grand (> 30 cm)",
] as const;

export const COLOR_MODES = ["Couleur", "Noir et gris"] as const;

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE_MB = 5;

const detailField = z
  .string()
  .trim()
  .max(DETAIL_MAX_LENGTH, `${DETAIL_MAX_LENGTH} caractères maximum`)
  .optional();

/**
 * Zone du corps et style : mêmes champs et mêmes règles pour la demande du
 * client et pour le projet saisi à la main par le tatoueur.
 */
export const projectDetailFields = {
  bodyLocation: z.string().refine(isBodyLocation, "Choisis une zone du corps"),
  bodyLocationDetail: detailField,
  style: z.string().refine(isStyle, "Choisis un style"),
  styleDetail: detailField,
  letteringStyle: z.string().optional(),
};

type ProjectDetails = {
  bodyLocation: string;
  bodyLocationDetail?: string;
  style: string;
  styleDetail?: string;
  letteringStyle?: string;
};

type IssueContext = {
  addIssue: (issue: { code: "custom"; path: string[]; message: string }) => void;
};

/** « Autre » doit être précisé ; un lettrage doit avoir son style d'écriture. */
export function checkProjectDetails(data: ProjectDetails, ctx: IssueContext) {
  if (data.bodyLocation === OTHER && !cleanDetail(data.bodyLocationDetail)) {
    ctx.addIssue({
      code: "custom",
      path: ["bodyLocationDetail"],
      message: "Précise la zone du corps",
    });
  }

  if (data.style === OTHER && !cleanDetail(data.styleDetail)) {
    ctx.addIssue({
      code: "custom",
      path: ["styleDetail"],
      message: "Précise le style souhaité",
    });
  }

  if (data.style === LETTERING) {
    if (!isLetteringStyle(data.letteringStyle)) {
      ctx.addIssue({
        code: "custom",
        path: ["letteringStyle"],
        message: "Choisis un style d'écriture",
      });
    } else if (data.letteringStyle === OTHER && !cleanDetail(data.styleDetail)) {
      ctx.addIssue({
        code: "custom",
        path: ["styleDetail"],
        message: "Précise le style d'écriture",
      });
    }
  }
}

export const tattooRequestSchema = z
  .object({
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
    ...projectDetailFields,
    sizeCategory: z.enum(SIZE_CATEGORIES),
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
  })
  .superRefine(checkProjectDetails);

export type TattooRequestInput = z.infer<typeof tattooRequestSchema>;
