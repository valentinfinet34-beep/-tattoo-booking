import { createClient } from "@/lib/supabase/server";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import type { Project } from "@/types/project";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Project[]>();

  return (
    <div>
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
