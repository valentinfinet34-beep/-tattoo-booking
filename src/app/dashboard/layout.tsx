import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-full">
      <div className="fixed inset-0 -z-10 bg-background">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 50% at 15% -10%, rgba(200,30,30,0.18), transparent), radial-gradient(ellipse 55% 45% at 100% 110%, rgba(217,119,6,0.10), transparent), radial-gradient(ellipse 40% 40% at 90% 0%, rgba(200,30,30,0.08), transparent)",
          }}
        />
      </div>

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

        <DashboardNav />

        {children}
      </div>
    </div>
  );
}
