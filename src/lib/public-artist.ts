import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

const PUBLIC_ARTIST_COLUMNS =
  "id, slug, display_name, avatar_url, city, bio, instagram_handle, portfolio_images, cover_image_url, accent_color, welcome_message, practiced_styles, working_days, min_lead_days, hours_start, hours_end";

async function fetchPublicArtist(slug: string) {
  const supabase = createAdminClient();

  const { data: artist } = await supabase
    .from("artists")
    .select(PUBLIC_ARTIST_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  return artist;
}

export type PublicArtist = NonNullable<
  Awaited<ReturnType<typeof fetchPublicArtist>>
>;

export type ArtistSlugResolution =
  | { kind: "found"; artist: PublicArtist }
  | { kind: "redirect"; slug: string }
  | { kind: "not_found" };

/**
 * Retrouve le pseudo ACTUEL d'un tatoueur à partir d'un pseudo demandé : le
 * même pseudo écrit avec une autre casse, ou un ancien pseudo encore en
 * redirection (90 jours après un changement). Renvoie null sinon.
 */
export async function findCurrentSlug(requested: string): Promise<string | null> {
  const supabase = createAdminClient();
  const lowered = requested.toLowerCase();

  if (lowered !== requested) {
    const { data } = await supabase
      .from("artists")
      .select("slug")
      .eq("slug", lowered)
      .maybeSingle();
    if (data) return data.slug as string;
  }

  const { data: history } = await supabase
    .from("artist_slug_history")
    .select("artist_id")
    .eq("old_slug", lowered)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!history) return null;

  const { data: current } = await supabase
    .from("artists")
    .select("slug")
    .eq("id", history.artist_id)
    .maybeSingle();

  return (current?.slug as string | undefined) ?? null;
}

/** Trouve un tatoueur par pseudo, ou dit où rediriger si ce pseudo a changé. */
export const resolvePublicArtist = cache(
  async (requested: string): Promise<ArtistSlugResolution> => {
    const artist = await fetchPublicArtist(requested);
    if (artist) return { kind: "found", artist };

    const current = await findCurrentSlug(requested);
    if (current && current !== requested) return { kind: "redirect", slug: current };

    return { kind: "not_found" };
  }
);

/**
 * Pour les routes d'API : lance la recherche avec le pseudo demandé et, s'il
 * ne correspond à rien, avec le pseudo actuel (un formulaire ouvert avant un
 * changement de pseudo continue ainsi de fonctionner).
 */
export async function withResolvedSlug<T>(
  slug: string,
  find: (slug: string) => Promise<T | null>
): Promise<T | null> {
  const direct = await find(slug);
  if (direct) return direct;

  const current = await findCurrentSlug(slug);
  return current ? find(current) : null;
}
