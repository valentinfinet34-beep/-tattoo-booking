import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-full bg-zinc-950">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950" />

      <div className="mx-auto max-w-2xl px-5 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1.5 bg-accent" />
            <span className="font-display text-xl tracking-widest text-zinc-100">
              STUDIO INK
            </span>
          </div>
          <LogoutButton />
        </div>

        <DashboardNav />

        {children}
      </div>
    </div>
  );
}
