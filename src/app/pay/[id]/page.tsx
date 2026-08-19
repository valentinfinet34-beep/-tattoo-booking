import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PayConfirmation } from "@/components/client/PayConfirmation";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default async function PayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, first_name, status, deposit_amount_cents, stripe_checkout_url, preferred_date, scheduled_start_time"
    )
    .eq("id", id)
    .maybeSingle();

  if (!project) notFound();

  const depositAmountEur = (project.deposit_amount_cents ?? 0) / 100;
  const canPay = project.status === "accepted" && project.stripe_checkout_url;

  return (
    <div className="flex min-h-full flex-col items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-4xl">Confirme ton acompte</h1>
        <p className="mb-6 text-sm text-muted">
          Bonjour {project.first_name}, voici le récapitulatif de ton
          rendez-vous.
        </p>

        <div className="card mb-5 p-4 text-sm">
          {project.scheduled_start_time && (
            <p className="text-foreground">
              {formatDate(project.preferred_date)} à{" "}
              {project.scheduled_start_time.slice(0, 5)}
            </p>
          )}
          <p className="mt-1 font-display text-2xl text-accent">
            {depositAmountEur} €
          </p>
          <p className="text-muted">Montant de l&apos;acompte</p>
        </div>

        {project.status === "deposit_paid" ? (
          <p className="card p-4 text-sm text-foreground">
            L&apos;acompte a déjà été réglé pour ce rendez-vous.
          </p>
        ) : canPay ? (
          <PayConfirmation
            projectId={project.id}
            checkoutUrl={project.stripe_checkout_url!}
            depositAmountEur={depositAmountEur}
          />
        ) : (
          <p className="card p-4 text-sm text-foreground">
            Ce lien de paiement n&apos;est plus valide.
          </p>
        )}
      </div>
    </div>
  );
}
