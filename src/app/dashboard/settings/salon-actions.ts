"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SALON_BIO_MAX,
  SALON_CITY_MAX,
  SALON_NAME_MAX,
  SALON_MAX_MEMBERS,
} from "@/lib/salon";
import { getSiteUrl } from "@/lib/site-url";
import { slugIssueFromDbError, validateSlug, type SlugIssue } from "@/lib/slug";

export type SalonResult = { ok: true } | { ok: false; message: string };

const GENERIC_ERROR = "Une erreur est survenue, réessaie dans un instant.";

const SALON_SLUG_MESSAGES: Record<SlugIssue, string> = {
  too_short: "Le lien du salon doit faire au moins 3 caractères.",
  too_long: "Le lien du salon est trop long (30 caractères maximum).",
  invalid_format:
    "Utilise seulement des lettres minuscules sans accent, des chiffres et des tirets (pas de tiret au début ni à la fin).",
  reserved: "Ce nom est réservé, choisis-en un autre.",
  taken: "Ce lien de salon est déjà pris, choisis-en un autre.",
  held: "Ce lien de salon est déjà pris, choisis-en un autre.",
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return { supabase, user };
}

function cleanText(value: string, max: number): string {
  return value.trim().slice(0, max);
}

export async function createSalon(input: {
  name: string;
  slug: string;
  city: string;
}): Promise<SalonResult> {
  const { supabase, user } = await requireUser();

  const name = cleanText(input.name, SALON_NAME_MAX);
  if (!name) return { ok: false, message: "Donne un nom à ton salon." };

  const slug = input.slug.trim();
  const issue = validateSlug(slug);
  if (issue) return { ok: false, message: SALON_SLUG_MESSAGES[issue] };

  const { data: existing } = await supabase
    .from("salon_members")
    .select("salon_id")
    .eq("artist_id", user.id)
    .maybeSingle();
  if (existing) {
    return { ok: false, message: "Tu fais déjà partie d'un salon." };
  }

  const { error } = await supabase.from("salons").insert({
    owner_id: user.id,
    slug,
    name,
    city: cleanText(input.city, SALON_CITY_MAX) || null,
  });

  if (error) {
    const dbIssue = slugIssueFromDbError(error);
    return {
      ok: false,
      message: dbIssue ? SALON_SLUG_MESSAGES[dbIssue] : GENERIC_ERROR,
    };
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function updateSalon(input: {
  name: string;
  city: string;
  bio: string;
}): Promise<SalonResult> {
  const { supabase, user } = await requireUser();

  const name = cleanText(input.name, SALON_NAME_MAX);
  if (!name) return { ok: false, message: "Le nom du salon ne peut pas être vide." };

  // La base ne laisse passer que le propriétaire (règles d'accès) ; le filtre
  // sur owner_id le rend explicite ici aussi.
  const { data, error } = await supabase
    .from("salons")
    .update({
      name,
      city: cleanText(input.city, SALON_CITY_MAX) || null,
      bio: cleanText(input.bio, SALON_BIO_MAX) || null,
    })
    .eq("owner_id", user.id)
    .select("id");

  if (error || !data?.length) {
    return { ok: false, message: "Seul le propriétaire du salon peut le modifier." };
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deleteSalon(): Promise<SalonResult> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("salons")
    .delete()
    .eq("owner_id", user.id)
    .select("id");

  if (error || !data?.length) {
    return { ok: false, message: "Seul le propriétaire du salon peut le supprimer." };
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export type InviteResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/** Crée un lien d'invitation (valable 7 jours, une seule personne). */
export async function createSalonInvite(): Promise<InviteResult> {
  const { supabase, user } = await requireUser();

  // Vérifie d'abord, avec les droits du tatoueur, qu'il possède bien un salon.
  const { data: salon } = await supabase
    .from("salons")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!salon) {
    return { ok: false, message: "Seul le propriétaire du salon peut inviter." };
  }

  const { count } = await supabase
    .from("salon_members")
    .select("artist_id", { count: "exact", head: true })
    .eq("salon_id", salon.id);
  if ((count ?? 0) >= SALON_MAX_MEMBERS) {
    return { ok: false, message: `Un salon peut avoir ${SALON_MAX_MEMBERS} tatoueurs au maximum.` };
  }

  const { data: token, error } = await createAdminClient().rpc("create_salon_invite", {
    p_owner: user.id,
  });
  if (error || typeof token !== "string") {
    return { ok: false, message: GENERIC_ERROR };
  }

  const siteUrl = getSiteUrl({ headers: await headers() });
  return { ok: true, url: `${siteUrl}/invitation-salon?token=${token}` };
}

export async function removeSalonMember(artistId: string): Promise<SalonResult> {
  const { supabase, user } = await requireUser();
  if (artistId === user.id) {
    return { ok: false, message: "Tu ne peux pas te retirer toi-même : supprime le salon à la place." };
  }

  // Seul le propriétaire retire quelqu'un, et uniquement de SON salon.
  const { data: salon } = await supabase
    .from("salons")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!salon) {
    return { ok: false, message: "Seul le propriétaire du salon peut retirer un tatoueur." };
  }

  const { data, error } = await supabase
    .from("salon_members")
    .delete()
    .eq("salon_id", salon.id)
    .eq("artist_id", artistId)
    .select("artist_id");

  if (error || !data?.length) {
    return { ok: false, message: "Ce tatoueur ne fait pas partie de ton salon." };
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function leaveSalon(): Promise<SalonResult> {
  const { supabase, user } = await requireUser();

  // Le propriétaire ne quitte pas son salon : il le supprime.
  const { data: owned } = await supabase
    .from("salons")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (owned) {
    return {
      ok: false,
      message: "Le propriétaire ne peut pas quitter son salon : il peut le supprimer.",
    };
  }

  const { data, error } = await supabase
    .from("salon_members")
    .delete()
    .eq("artist_id", user.id)
    .select("artist_id");

  if (error || !data?.length) {
    return { ok: false, message: "Tu ne fais partie d'aucun salon." };
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/** Rejoint un salon avec un lien d'invitation. */
export async function acceptSalonInvite(token: string): Promise<SalonResult> {
  const { user } = await requireUser();

  const clean = token.trim();
  if (!/^[a-f0-9]{64}$/.test(clean)) {
    return { ok: false, message: "Ce lien d'invitation n'est pas valide." };
  }

  const { error } = await createAdminClient().rpc("accept_salon_invite", {
    p_token: clean,
    p_artist: user.id,
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("already_in_salon")) {
      return { ok: false, message: "Tu fais déjà partie d'un salon. Quitte-le d'abord pour en rejoindre un autre." };
    }
    if (message.includes("salon_full")) {
      return { ok: false, message: "Ce salon est complet." };
    }
    if (message.includes("invite_invalid")) {
      return { ok: false, message: "Ce lien d'invitation a expiré ou a déjà été utilisé. Demande-en un nouveau au salon." };
    }
    return { ok: false, message: GENERIC_ERROR };
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
