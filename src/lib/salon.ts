import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { trustedStorageUrl } from "@/lib/storage-url";

export const SALON_NAME_MAX = 80;
export const SALON_CITY_MAX = 80;
export const SALON_BIO_MAX = 600;
export const SALON_MAX_MEMBERS = 20;

export function salonPath(slug: string): string {
  return `/salon/${slug}`;
}

export type SalonMember = {
  id: string;
  displayName: string;
  slug: string | null;
  avatarUrl: string | null;
  isOwner: boolean;
};

export type MySalon = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  bio: string | null;
  isOwner: boolean;
  members: SalonMember[];
};

/**
 * Le salon du tatoueur connecté (ou null). Les droits d'accès sont ceux de la
 * base (RLS) : seul un membre voit son salon et la liste de ses collègues.
 * Les noms et pseudos des collègues sont ensuite lus côté serveur, uniquement
 * pour les identifiants que la base vient de renvoyer.
 */
export async function getMySalon(
  supabase: SupabaseClient,
  userId: string
): Promise<MySalon | null> {
  const { data: membership } = await supabase
    .from("salon_members")
    .select("salon_id")
    .eq("artist_id", userId)
    .maybeSingle();
  if (!membership) return null;

  const { data: salon } = await supabase
    .from("salons")
    .select("id, owner_id, slug, name, city, bio")
    .eq("id", membership.salon_id)
    .maybeSingle();
  if (!salon) return null;

  const { data: memberRows } = await supabase
    .from("salon_members")
    .select("artist_id")
    .eq("salon_id", salon.id);
  const ids = (memberRows ?? []).map((m) => m.artist_id as string);

  const { data: artists } = ids.length
    ? await createAdminClient()
        .from("artists")
        .select("id, display_name, slug, avatar_url")
        .in("id", ids)
    : { data: [] };

  const members: SalonMember[] = (artists ?? [])
    .map((a) => ({
      id: a.id as string,
      displayName: (a.display_name as string | null) ?? "Tatoueur",
      slug: (a.slug as string | null) ?? null,
      avatarUrl: trustedStorageUrl(a.avatar_url as string | null),
      isOwner: a.id === salon.owner_id,
    }))
    .sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || a.displayName.localeCompare(b.displayName, "fr"));

  return {
    id: salon.id as string,
    slug: salon.slug as string,
    name: salon.name as string,
    city: (salon.city as string | null) ?? null,
    bio: (salon.bio as string | null) ?? null,
    isOwner: salon.owner_id === userId,
    members,
  };
}

export type PublicSalonMember = {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  city: string | null;
  instagramHandle: string | null;
  practicedStyles: string[];
};

export type PublicSalon = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  bio: string | null;
  members: PublicSalonMember[];
};

/**
 * Page publique d'un salon : uniquement des informations déjà publiques sur
 * les pages de réservation des tatoueurs (jamais de demandes, de clients ni de
 * paiements).
 */
export const fetchPublicSalon = cache(
  async (slug: string): Promise<PublicSalon | null> => {
    const supabase = createAdminClient();

    const { data: salon } = await supabase
      .from("salons")
      .select("id, slug, name, city, bio")
      .eq("slug", slug)
      .maybeSingle();
    if (!salon) return null;

    const { data: memberRows } = await supabase
      .from("salon_members")
      .select("artist_id")
      .eq("salon_id", salon.id);
    const ids = (memberRows ?? []).map((m) => m.artist_id as string);

    const { data: artists } = ids.length
      ? await supabase
          .from("artists")
          .select("id, slug, display_name, avatar_url, city, instagram_handle, practiced_styles")
          .in("id", ids)
      : { data: [] };

    const members: PublicSalonMember[] = (artists ?? [])
      .filter((a) => Boolean(a.slug))
      .map((a) => ({
        id: a.id as string,
        slug: a.slug as string,
        displayName: (a.display_name as string | null) ?? "Tatoueur",
        avatarUrl: trustedStorageUrl(a.avatar_url as string | null),
        city: (a.city as string | null) ?? null,
        instagramHandle: (a.instagram_handle as string | null) ?? null,
        practicedStyles: (a.practiced_styles as string[] | null) ?? [],
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));

    return {
      id: salon.id as string,
      slug: salon.slug as string,
      name: salon.name as string,
      city: (salon.city as string | null) ?? null,
      bio: (salon.bio as string | null) ?? null,
      members,
    };
  }
);
