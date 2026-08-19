import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${SITE_URL}/login`);
  }

  const { data: artist } = await supabase
    .from("artists")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  if (artist?.stripe_account_id) {
    const account = await getStripe().accounts.retrieve(
      artist.stripe_account_id
    );

    await supabase
      .from("artists")
      .update({ stripe_charges_enabled: account.charges_enabled })
      .eq("id", user.id);
  }

  return NextResponse.redirect(`${SITE_URL}/dashboard/settings#stripe`);
}
