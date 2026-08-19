"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAccentColorKey } from "@/lib/theme-presets";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return { supabase, user };
}

export async function uploadCoverImage(formData: FormData) {
  const { supabase, user } = await requireUser();

  const file = formData.get("cover");
  if (!(file instanceof File)) throw new Error("Fichier manquant");

  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/cover.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("cover-images")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw new Error("Échec de l'upload");

  const { data: publicUrl } = supabase.storage
    .from("cover-images")
    .getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("artists")
    .update({ cover_image_url: publicUrl.publicUrl })
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

export async function uploadAvatar(formData: FormData) {
  const { supabase, user } = await requireUser();

  const file = formData.get("avatar");
  if (!(file instanceof File)) throw new Error("Fichier manquant");

  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw new Error("Échec de l'upload");

  const { data: publicUrl } = supabase.storage
    .from("avatars")
    .getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("artists")
    .update({ avatar_url: publicUrl.publicUrl })
    .eq("id", user.id);

  if (updateError) throw new Error("Échec de la mise à jour");

  revalidatePath("/dashboard/settings");
}

export async function resetAvatar() {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("artists")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (error) throw new Error("Échec de la réinitialisation");

  revalidatePath("/dashboard/settings");
}

const MAX_PORTFOLIO_IMAGES = 4;

export async function uploadPortfolioImage(formData: FormData) {
  const { supabase, user } = await requireUser();

  const file = formData.get("photo");
  if (!(file instanceof File)) throw new Error("Fichier manquant");

  const { data: artist } = await supabase
    .from("artists")
    .select("portfolio_images")
    .eq("id", user.id)
    .single();

  const current = artist?.portfolio_images ?? [];
  if (current.length >= MAX_PORTFOLIO_IMAGES) {
    throw new Error(`${MAX_PORTFOLIO_IMAGES} photos maximum`);
  }

  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

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
    .update({ practiced_styles: styles })
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
