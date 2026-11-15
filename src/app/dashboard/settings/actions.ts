"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkSlugAvailability } from "@/lib/slug-availability";
import { validatePaymentLink, type PaymentMethod } from "@/lib/payment";
import { slugIssueFromDbError, slugIssueMessage } from "@/lib/slug";
import { isAccentColorKey } from "@/lib/theme-presets";
import { sanitizePracticedStyles } from "@/lib/tattoo-catalog";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return { supabase, user };
}

// Les photos sont réduites dans le navigateur avant l’envoi (voir
// src/lib/image-resize.ts) : elles arrivent ici en JPEG léger. On revérifie
// quand même le type et le poids côté serveur.
const UPLOAD_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_UPLOAD_BYTES = 1_000_000;

type CheckedImage =
  | { ok: true; file: File; extension: string }
  | { ok: false; message: string };

function checkImage(entry: FormDataEntryValue | null): CheckedImage {
  if (!(entry instanceof File) || entry.size === 0) {
    return { ok: false, message: "Aucune photo reçue. Réessaie." };
  }
  const extension = UPLOAD_EXTENSIONS[entry.type];
  if (!extension) {
    return { ok: false, message: "Format non pris en charge. Choisis une photo JPG ou PNG." };
  }
  if (entry.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: "Photo trop lourde. Réessaie avec une autre photo." };
  }
  return { ok: true, file: entry, extension };
}

function storageFailureMessage(error: { message?: string }): string {
  const text = (error.message ?? "").toLowerCase();
  if (
    text.includes("row-level security") ||
    text.includes("unauthorized") ||
    text.includes("not authorized") ||
    text.includes("bucket not found")
  ) {
    return "Le stockage des photos refuse l’envoi pour ton compte. Le problème vient de TattFlow, pas de ta photo.";
  }
  if (text.includes("mime") || text.includes("type")) {
    return "Format non pris en charge. Choisis une photo JPG ou PNG.";
  }
  if (text.includes("exceeded") || text.includes("too large") || text.includes("size")) {
    return "Photo trop lourde. Réessaie avec une autre photo.";
  }
  return "Échec de l’envoi de la photo. Réessaie dans un instant.";
}

/**
 * Chemin d’un fichier du tatoueur à partir de son adresse publique, ou null si
 * l’adresse ne pointe pas dans SON dossier (on ne supprime jamais ailleurs).
 */
function ownStoragePath(url: string | null | undefined, bucket: string, userId: string): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  let path: string;
  try {
    path = decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
  } catch {
    return null;
  }
  if (!path.startsWith(`${userId}/`) || path.includes("..")) return null;
  return path;
}

export async function uploadCoverImage(formData: FormData) {
  const { supabase, user } = await requireUser();

  const checked = checkImage(formData.get("cover"));
  if (!checked.ok) throw new Error(checked.message);

  const path = `${user.id}/cover.${checked.extension}`;

  const { error: uploadError } = await supabase.storage
    .from("cover-images")
    .upload(path, checked.file, { upsert: true, contentType: checked.file.type });

  if (uploadError) throw new Error("Échec de l’upload");

  const { data: publicUrl } = supabase.storage
    .from("cover-images")
    .getPublicUrl(path);

  // Le fichier garde le même nom d’un envoi à l’autre : le suffixe force les
  // navigateurs à recharger la nouvelle photo au lieu de garder l’ancienne.
  const { error: updateError } = await supabase
    .from("artists")
    .update({ cover_image_url: `${publicUrl.publicUrl}?v=${Date.now()}` })
    .eq("id", user.id);

  if (updateError) throw new Error("Échec de la mise à jour");

  revalidatePath("/dashboard/settings");
}

export async function resetCoverImage() {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("artists")
    .update({ cover_image_url: null })
    .eq("id", user.id);

  if (error) throw new Error("Échec de la réinitialisation");

  revalidatePath("/dashboard/settings");
}

export type PhotoResult = { ok: true; url: string } | { ok: false; message: string };

/**
 * Photo de profil. Chaque envoi crée un nouveau fichier dans le dossier du
 * tatoueur (l’adresse change, donc la nouvelle photo s’affiche tout de suite),
 * puis l’ancienne est supprimée si possible.
 */
export async function uploadAvatar(formData: FormData): Promise<PhotoResult> {
  const { supabase, user } = await requireUser();

  const checked = checkImage(formData.get("avatar"));
  if (!checked.ok) return checked;

  const { data: current } = await supabase
    .from("artists")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const path = `${user.id}/avatar-${Date.now()}.${checked.extension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, checked.file, { contentType: checked.file.type });

  if (uploadError) return { ok: false, message: storageFailureMessage(uploadError) };

  const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("artists")
    .update({ avatar_url: publicUrl.publicUrl })
    .eq("id", user.id);

  if (updateError) {
    return { ok: false, message: "La photo est envoyée mais n’a pas pu être enregistrée. Réessaie." };
  }

  const previous = ownStoragePath(current?.avatar_url, "avatars", user.id);
  if (previous && previous !== path) {
    // Ménage facultatif : un échec ici ne change rien pour le tatoueur.
    await supabase.storage.from("avatars").remove([previous]);
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true, url: publicUrl.publicUrl };
}

export async function resetAvatar() {
  const { supabase, user } = await requireUser();

  const { data: current } = await supabase
    .from("artists")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("artists")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (error) throw new Error("Échec de la réinitialisation");

  const previous = ownStoragePath(current?.avatar_url, "avatars", user.id);
  if (previous) await supabase.storage.from("avatars").remove([previous]);

  revalidatePath("/dashboard", "layout");
}

const MAX_PORTFOLIO_IMAGES = 12;

export async function uploadPortfolioImage(formData: FormData) {
  const { supabase, user } = await requireUser();

  const checked = checkImage(formData.get("photo"));
  if (!checked.ok) throw new Error(checked.message);
  const file = checked.file;

  const { data: artist } = await supabase
    .from("artists")
    .select("portfolio_images")
    .eq("id", user.id)
    .single();

  const current = artist?.portfolio_images ?? [];
  if (current.length >= MAX_PORTFOLIO_IMAGES) {
    throw new Error(`${MAX_PORTFOLIO_IMAGES} photos maximum`);
  }

  const path = `${user.id}/${crypto.randomUUID()}.${checked.extension}`;

  const { error: uploadError } = await supabase.storage
    .from("portfolio-images")
    .upload(path, file, { contentType: file.type });

  if (uploadError) throw new Error("Échec de l'upload");

  const { data: publicUrl } = supabase.storage
    .from("portfolio-images")
    .getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("artists")
    .update({ portfolio_images: [...current, publicUrl.publicUrl] })
    .eq("id", user.id);

  if (updateError) throw new Error("Échec de la mise à jour");

  revalidatePath("/dashboard/settings");
}

export async function removePortfolioImage(url: string) {
  const { supabase, user } = await requireUser();

  const { data: artist } = await supabase
    .from("artists")
    .select("portfolio_images")
    .eq("id", user.id)
    .single();

  const next = (artist?.portfolio_images ?? []).filter(
    (u: string) => u !== url
  );

  const { error } = await supabase
    .from("artists")
    .update({ portfolio_images: next })
    .eq("id", user.id);

  if (error) throw new Error("Échec de la suppression");

  revalidatePath("/dashboard/settings");
}

export async function reorderPortfolioImages(orderedUrls: string[]) {
  const { supabase, user } = await requireUser();

  const { data: artist } = await supabase
    .from("artists")
    .select("portfolio_images")
    .eq("id", user.id)
    .single();

  const current: string[] = artist?.portfolio_images ?? [];
  const sameSet =
    current.length === orderedUrls.length &&
    current.every((u) => orderedUrls.includes(u));
  if (!sameSet) throw new Error("Liste invalide");

  const { error } = await supabase
    .from("artists")
    .update({ portfolio_images: orderedUrls })
    .eq("id", user.id);

  if (error) throw new Error("Échec de la réorganisation");

  revalidatePath("/dashboard/settings");
}

export async function updateProfile({
  displayName,
  city,
  bio,
  instagramHandle,
}: {
  displayName: string;
  city: string;
  bio: string;
  instagramHandle: string;
}) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("artists")
    .update({
      display_name: displayName.trim() || null,
      city: city.trim() || null,
      bio: bio.trim() || null,
      instagram_handle: instagramHandle.trim() || null,
    })
    .eq("id", user.id);

  if (error) throw new Error("Échec de la mise à jour");

  revalidatePath("/dashboard/settings");
}

export async function updateWelcomeMessage(message: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("artists")
    .update({ welcome_message: message.trim() || null })
    .eq("id", user.id);

  if (error) throw new Error("Échec de la mise à jour");

  revalidatePath("/dashboard/settings");
}

export async function updatePracticedStyles(styles: string[]) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("artists")
    .update({ practiced_styles: sanitizePracticedStyles(styles) })
    .eq("id", user.id);

  if (error) throw new Error("Échec de la mise à jour");

  revalidatePath("/dashboard/settings");
}

export async function setDepositDefaults({
  depositType,
  depositPercentage,
  depositFixedAmountEur,
  depositExpiryHours,
}: {
  depositType: "percentage" | "fixed";
  depositPercentage: number;
  depositFixedAmountEur: number;
  depositExpiryHours: number;
}) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("artists")
    .update({
      deposit_type: depositType,
      deposit_percentage: depositPercentage,
      deposit_fixed_amount_cents: Math.round(depositFixedAmountEur * 100),
      deposit_expiry_hours: depositExpiryHours,
    })
    .eq("id", user.id);

  if (error) throw new Error("Échec de la mise à jour");

  revalidatePath("/dashboard/settings");
}

export async function updateAvailabilitySettings({
  workingDays,
  hoursStart,
  hoursEnd,
  minLeadDays,
}: {
  workingDays: number[];
  hoursStart: number;
  hoursEnd: number;
  minLeadDays: number;
}) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("artists")
    .update({
      working_days: workingDays,
      hours_start: hoursStart,
      hours_end: hoursEnd,
      min_lead_days: minLeadDays,
    })
    .eq("id", user.id);

  if (error) throw new Error("Échec de la mise à jour");

  revalidatePath("/dashboard/settings");
}

export async function updateNotificationPrefs({
  notifyNewRequest,
  notifyQuoteAccepted,
  notifyDepositPaid,
  notifyReminder24h,
}: {
  notifyNewRequest: boolean;
  notifyQuoteAccepted: boolean;
  notifyDepositPaid: boolean;
  notifyReminder24h: boolean;
}) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("artists")
    .update({
      notify_new_request: notifyNewRequest,
      notify_quote_accepted: notifyQuoteAccepted,
      notify_deposit_paid: notifyDepositPaid,
      notify_reminder_24h: notifyReminder24h,
    })
    .eq("id", user.id);

  if (error) throw new Error("Échec de la mise à jour");

  revalidatePath("/dashboard/settings");
}

export type PaymentMethodResult = { ok: true } | { ok: false; message: string };

/** Choisit comment le tatoueur encaisse ses acomptes : Stripe ou son propre lien de paiement. */
export async function updatePaymentMethod({
  method,
  link,
}: {
  method: PaymentMethod;
  link: string;
}): Promise<PaymentMethodResult> {
  const { supabase, user } = await requireUser();

  let changes: { payment_method: PaymentMethod; payment_link_url?: string };

  if (method === "external_link") {
    const checked = validatePaymentLink(link);
    if (!checked.ok) return { ok: false, message: checked.message };
    changes = { payment_method: "external_link", payment_link_url: checked.url };
  } else if (method === "stripe") {
    changes = { payment_method: "stripe" };
  } else {
    return { ok: false, message: "Moyen d'encaissement inconnu." };
  }

  const { error } = await supabase
    .from("artists")
    .update(changes)
    .eq("id", user.id);

  if (error) {
    return { ok: false, message: "Échec de l'enregistrement, réessaie dans un instant." };
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export type ChangeSlugResult =
  | { ok: true; slug: string }
  | { ok: false; message: string; suggestions: string[] };

/**
 * Change le lien public du tatoueur connecté. Le pseudo vit dans une colonne
 * verrouillée : le changement passe par la fonction change_artist_slug(), qui
 * garde l'ancien lien 90 jours (redirection) et ne change rien en cas d'échec.
 */
export async function changeSlug(rawSlug: string): Promise<ChangeSlugResult> {
  const { user } = await requireUser();
  const slug = rawSlug.trim();

  const availability = await checkSlugAvailability(slug, { artistId: user.id });
  if (!availability.available) {
    return {
      ok: false,
      message: availability.message ?? slugIssueMessage("taken"),
      suggestions: availability.suggestions,
    };
  }

  const { error } = await createAdminClient().rpc("change_artist_slug", {
    p_artist_id: user.id,
    p_new_slug: slug,
  });

  if (error) {
    // Course perdue (le pseudo vient d'être pris) ou migration 0018 pas encore appliquée.
    const issue = slugIssueFromDbError(error);
    return {
      ok: false,
      message: issue
        ? slugIssueMessage(issue)
        : "Impossible de changer ton lien pour le moment. Réessaie dans un instant.",
      suggestions: [],
    };
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true, slug };
}

export async function setAccentColor(colorKey: string) {
  if (!isAccentColorKey(colorKey)) throw new Error("Couleur invalide");

  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("artists")
    .update({ accent_color: colorKey })
    .eq("id", user.id);

  if (error) throw new Error("Échec de la mise à jour");

  revalidatePath("/dashboard/settings");
}
