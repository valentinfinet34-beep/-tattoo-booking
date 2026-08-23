import { createAdminClient } from "@/lib/supabase/admin";

export async function getPublicArtistBySlug(slug: string) {
  const supabase = createAdminClient();

  const { data: artist } = await supabase
    .from("artists")
    .select(
      "id, display_name, avatar_url, city, bio, portfolio_images, cover_image_url, accent_color, welcome_message, practiced_styles, working_days, min_lead_days, hours_start, hours_end"
    )
    .eq("slug", slug)
    .maybeSingle();

  return artist;
}
