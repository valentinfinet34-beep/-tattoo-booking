import { createClient } from "@/lib/supabase/server";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import type { Project } from "@/types/project";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Project[]>();

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-1.5 bg-accent" />
          <span className="font-display text-xl tracking-widest">
            STUDIO INK
          </span>
        </div>
        <LogoutButton />
      </div>

      <h1 className="mb-6 text-3xl">Demandes reçues</h1>

      {!projects || projects.length === 0 ? (
        <p className="text-sm text-muted">Aucune demande pour l&apos;instant.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
