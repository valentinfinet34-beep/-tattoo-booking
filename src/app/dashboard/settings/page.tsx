import { createClient } from "@/lib/supabase/server";
import { PageSettings } from "@/components/dashboard/PageSettings";
import { DepositSettings } from "@/components/dashboard/DepositSettings";
import {
  DEFAULT_ACCENT,
  isAccentColorKey,
  type AccentColorKey,
} from "@/lib/theme-presets";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: artist } = await supabase
    .from("artists")
    .select(
      "cover_image_url, accent_color, deposit_type, deposit_percentage, deposit_fixed_amount_cents"
    )
    .eq("id", user!.id)
    .single();

  const accentColor: AccentColorKey =
    artist?.accent_color && isAccentColorKey(artist.accent_color)
      ? artist.accent_color
      : DEFAULT_ACCENT;

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-3xl text-zinc-100">Paramètres</h1>

      <div>
        <h2 className="mb-1 font-display text-lg tracking-wide text-zinc-100">
          Page de réservation
        </h2>
        <p className="mb-4 text-xs text-zinc-500">
          Ces réglages s&apos;appliquent directement à ta page de réservation
          publique.
        </p>

        <PageSettings
          coverImageUrl={artist?.cover_image_url ?? null}
          accentColor={accentColor}
        />
      </div>

      <DepositSettings
        depositType={
          artist?.deposit_type === "fixed" ? "fixed" : "percentage"
        }
        depositPercentage={artist?.deposit_percentage ?? 20}
        depositFixedAmountCents={artist?.deposit_fixed_amount_cents ?? null}
      />
    </div>
  );
}
