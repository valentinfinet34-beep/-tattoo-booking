"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setNoShow(projectId: string, noShow: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("projects")
    .update({ no_show: noShow })
    .eq("id", projectId)
    .eq("artist_id", user.id);

  if (error) throw new Error("Échec de la mise à jour");

  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/stats");
}
