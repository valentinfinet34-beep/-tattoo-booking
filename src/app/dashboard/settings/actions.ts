"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAccentColorKey } from "@/lib/theme-presets";

export async function uploadCoverImage(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Non authentifié");

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("artists")
    .update({ cover_image_url: null })
    .eq("id", user.id);

  if (error) throw new Error("Échec de la réinitialisation");

  revalidatePath("/dashboard/settings");
}

export async function setDepositDefaults({
  depositType,
  depositPercentage,
  depositFixedAmountEur,
}: {
  depositType: "percentage" | "fixed";
  depositPercentage: number;
  depositFixedAmountEur: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("artists")
    .update({
      deposit_type: depositType,
      deposit_percentage: depositPercentage,
      deposit_fixed_amount_cents: Math.round(depositFixedAmountEur * 100),
    })
    .eq("id", user.id);

  if (error) throw new Error("Échec de la mise à jour");

  revalidatePath("/dashboard/settings");
}

export async function setAccentColor(colorKey: string) {
  if (!isAccentColorKey(colorKey)) throw new Error("Couleur invalide");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("artists")
    .update({ accent_color: colorKey })
    .eq("id", user.id);

  if (error) throw new Error("Échec de la mise à jour");

  revalidatePath("/dashboard/settings");
}
