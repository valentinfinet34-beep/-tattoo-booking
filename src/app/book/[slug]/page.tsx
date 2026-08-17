import { notFound } from "next/navigation";
import Image from "next/image";
import { TattooRequestForm } from "@/components/client/TattooRequestForm";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function getArtistAndBlockedDates(slug: string) {
  const supabase = createAdminClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("id, display_name")
    .eq("slug", slug)
    .maybeSingle();

  if (!artist) return null;

  const { data } = await supabase
    .from("blocked_dates")
    .select("blocked_date")
    .eq("artist_id", artist.id)
    .gte("blocked_date", new Date().toISOString().split("T")[0]);

  const blockedDates = (data ?? []).map((row) => row.blocked_date as string);

  return { artist, blockedDates };
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getArtistAndBlockedDates(slug);

  if (!result) notFound();

  const { artist, blockedDates } = result;

  return (
    <div className="relative flex min-h-full flex-col items-center px-5 py-10">
      <div className="absolute inset-0 -z-10 overflow-hidden bg-background">
        <Image
          src="https://images.unsplash.com/photo-1532543149533-f0ed72f555c3?fm=jpg&q=80&w=1920&auto=format&fit=crop"
          alt=""
          fill
          priority
          className="object-cover object-top contrast-110 saturate-125"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/25 to-background" />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex animate-fade-in-up items-center gap-2 [text-shadow:_0_2px_10px_rgb(0_0_0_/_75%)]">
          <div className="h-5 w-1.5 bg-accent" />
          <span className="font-display text-xl tracking-widest">
            {artist.display_name}
          </span>
        </div>

        <h1 className="mb-2 animate-fade-in-up text-4xl [animation-delay:250ms] [text-shadow:_0_2px_14px_rgb(0_0_0_/_75%)]">
          Réservez votre séance
        </h1>
        <p className="mb-6 animate-fade-in-up text-sm text-muted [animation-delay:450ms] [text-shadow:_0_1px_8px_rgb(0_0_0_/_85%)]">
          Remplissez le formulaire, l&apos;artiste valide sous 24-48h.
        </p>

        <div className="animate-fade-in-up [animation-delay:700ms]">
          <TattooRequestForm blockedDates={blockedDates} artistSlug={slug} />
        </div>
      </div>
    </div>
  );
}
