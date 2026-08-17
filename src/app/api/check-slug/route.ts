import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SLUG_REGEX } from "@/lib/slug";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? "";

  if (!SLUG_REGEX.test(slug) || slug.length < 3) {
    return NextResponse.json({ available: false });
  }

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("artists")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  return NextResponse.json({ available: !data });
}
