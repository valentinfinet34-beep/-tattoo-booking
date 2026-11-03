import { createAdminClient } from "@/lib/supabase/admin";
import {
  slugIssueMessage,
  slugSuggestionCandidates,
  slugify,
  validateSlug,
  type SlugIssue,
} from "@/lib/slug";

export type SlugAvailability = {
  available: boolean;
  slug: string;
  reason?: SlugIssue;
  message?: string;
  suggestions: string[];
};

const MAX_SUGGESTIONS = 3;

async function lookupSlugs(slugs: string[]) {
  const supabase = createAdminClient();

  const [{ data: owned }, { data: held }] = await Promise.all([
    supabase.from("artists").select("id, slug").in("slug", slugs),
    supabase
      .from("artist_slug_history")
      .select("old_slug, artist_id")
      .in("old_slug", slugs)
      .gt("expires_at", new Date().toISOString()),
  ]);

  return {
    owners: new Map((owned ?? []).map((row) => [row.slug as string, row.id as string])),
    holders: new Map(
      (held ?? []).map((row) => [row.old_slug as string, row.artist_id as string])
    ),
  };
}

async function freeSuggestions(slug: string, artistId?: string): Promise<string[]> {
  const cleaned = slugify(slug);
  const candidates = [
    ...(cleaned && cleaned !== slug && validateSlug(cleaned) === null ? [cleaned] : []),
    ...slugSuggestionCandidates(slug),
  ];

  const { owners, holders } = await lookupSlugs(candidates);

  return candidates
    .filter((candidate) => !owners.has(candidate))
    .filter((candidate) => !holders.has(candidate) || holders.get(candidate) === artistId)
    .slice(0, MAX_SUGGESTIONS);
}

/**
 * Dit si un pseudo est utilisable. `artistId` (tatoueur connecté) lui permet de
 * garder son pseudo actuel ou de reprendre un de ses anciens pseudos.
 */
export async function checkSlugAvailability(
  slug: string,
  options: { artistId?: string } = {}
): Promise<SlugAvailability> {
  const { artistId } = options;

  const unavailable = async (reason: SlugIssue): Promise<SlugAvailability> => ({
    available: false,
    slug,
    reason,
    message: slugIssueMessage(reason),
    suggestions: await freeSuggestions(slug, artistId),
  });

  const issue = validateSlug(slug);
  if (issue && issue !== "reserved") return unavailable(issue);

  const { owners, holders } = await lookupSlugs([slug]);

  if (owners.has(slug)) {
    return owners.get(slug) === artistId
      ? { available: true, slug, suggestions: [] }
      : unavailable("taken");
  }

  if (holders.has(slug)) {
    return holders.get(slug) === artistId
      ? { available: true, slug, suggestions: [] }
      : unavailable("held");
  }

  if (issue === "reserved") return unavailable("reserved");

  return { available: true, slug, suggestions: [] };
}
