import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkSlugAvailability } from "@/lib/slug-availability";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? "";

  // Un tatoueur connecté peut garder son pseudo actuel ou reprendre un ancien.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = await checkSlugAvailability(slug, { artistId: user?.id });

  return NextResponse.json(result);
}
