"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function blockDate(date: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("blocked_dates")
    .insert({ artist_id: user.id, blocked_date: date });

  // Code 23505 = violation de contrainte unique (déjà bloquée) : on ignore.
  if (error && error.code !== "23505") {
    throw new Error("Échec du blocage de la date");
  }

  revalidatePath("/dashboard/availability");
}

export async function unblockDate(date: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("blocked_dates")
    .delete()
    .eq("blocked_date", date);

  if (error) throw new Error("Échec du déblocage de la date");

  revalidatePath("/dashboard/availability");
}
