import { createClient } from "@/lib/supabase/server";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { OnboardingCard } from "@/components/dashboard/OnboardingCard";
import type { Project } from "@/types/project";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data }, { data: artist }] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<Project[]>(),
    supabase
      .from("artists")
      .select(
        "slug, stripe_charges_enabled, cover_image_url, deposit_type, deposit_percentage, deposit_fixed_amount_cents"
      )
      .eq("id", user!.id)
      .single(),
  ]);

  const depositDefaults = {
    depositType: (artist?.deposit_type === "fixed" ? "fixed" : "percentage") as
      | "percentage"
      | "fixed",
    depositPercentage: artist?.deposit_percentage ?? 20,
    depositFixedAmountCents: artist?.deposit_fixed_amount_cents ?? null,
  };

  const projects = data ?? [];
  const pending = projects.filter((p) => p.status === "pending");
  const awaitingPayment = projects.filter((p) => p.status === "accepted");
  const confirmed = projects
    .filter((p) => p.status === "deposit_paid")
    .sort((a, b) => a.preferred_date.localeCompare(b.preferred_date));

  return (
    <div className="flex flex-col gap-8">
      {artist && (
        <OnboardingCard
          slug={artist.slug}
          stripeConnected={artist.stripe_charges_enabled}
          pageCustomized={!!artist.cover_image_url}
        />
      )}

      <DashboardStats projects={projects} />

      <Section
        title="Nouvelles demandes"
        count={pending.length}
        emptyLabel="Aucune nouvelle demande pour l'instant."
      >
        {pending.map((project) => (
          <ProjectCard key={project.id} project={project} depositDefaults={depositDefaults} />
        ))}
      </Section>

      {awaitingPayment.length > 0 && (
        <Section title="En attente de paiement" count={awaitingPayment.length}>
          {awaitingPayment.map((project) => (
            <ProjectCard key={project.id} project={project} depositDefaults={depositDefaults} />
          ))}
        </Section>
      )}

      {confirmed.length > 0 && (
        <Section title="Rendez-vous confirmés" count={confirmed.length}>
          {confirmed.map((project) => (
            <ProjectCard key={project.id} project={project} depositDefaults={depositDefaults} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  emptyLabel,
  children,
}: {
  title: string;
  count: number;
  emptyLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-lg tracking-wide text-zinc-100">
          {title}
        </h2>
        {count > 0 && (
          <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-xs text-zinc-400">
            {count}
          </span>
        )}
      </div>
      {count === 0 && emptyLabel ? (
        <p className="text-sm text-zinc-500">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-4">{children}</div>
      )}
    </section>
  );
}
