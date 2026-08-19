import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { QuoteResponse } from "@/components/client/QuoteResponse";

export const dynamic = "force-dynamic";

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string }>;
}) {
  const { id } = await params;
  const { action } = await searchParams;
  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, first_name, status, quoted_price_cents, artist_id")
    .eq("id", id)
    .maybeSingle();

  if (!project) notFound();

  const quotedPriceEur = (project.quoted_price_cents ?? 0) / 100;

  let depositPreviewEur = 0;
  if (project.status === "quoted") {
    const { data: artist } = await supabase
      .from("artists")
      .select("deposit_type, deposit_percentage, deposit_fixed_amount_cents")
      .eq("id", project.artist_id)
      .single();

    if (artist?.deposit_type === "fixed") {
      depositPreviewEur = artist.deposit_fixed_amount_cents
        ? artist.deposit_fixed_amount_cents / 100
        : Math.round(quotedPriceEur * 0.2);
    } else {
      depositPreviewEur = Math.round(
        (quotedPriceEur * (artist?.deposit_percentage ?? 20)) / 100
      );
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-4xl">Ton devis</h1>
        <p className="mb-6 text-sm text-muted">
          Bonjour {project.first_name}, voici la proposition de
          l&apos;artiste pour ton projet.
        </p>

        <div className="card mb-5 p-4 text-sm">
          <p className="font-display text-3xl text-accent">
            {quotedPriceEur} €
          </p>
          <p className="text-muted">Prix estimé du tatouage</p>
        </div>

        {project.status === "quoted" ? (
          <QuoteResponse
            projectId={project.id}
            quotedPriceEur={quotedPriceEur}
            depositPreviewEur={depositPreviewEur}
            initialAction={action}
          />
        ) : project.status === "accepted" ? (
          <p className="card p-4 text-sm text-foreground">
            Tu as déjà accepté ce devis —{" "}
            <a href={`/pay/${project.id}`} className="text-accent hover:underline">
              règle ton acompte ici
            </a>
            .
          </p>
        ) : project.status === "deposit_paid" ? (
          <p className="card p-4 text-sm text-foreground">
            Tu as déjà accepté ce devis et réglé ton acompte, à bientôt !
          </p>
        ) : project.status === "quote_declined" ? (
          <p className="card p-4 text-sm text-foreground">
            Tu as décliné ce devis.
          </p>
        ) : (
          <p className="card p-4 text-sm text-foreground">
            Ce devis n&apos;est plus disponible.
          </p>
        )}
      </div>
    </div>
  );
}
