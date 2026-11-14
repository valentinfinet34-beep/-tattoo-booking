import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AtSign, ChevronRight, MapPin } from "lucide-react";
import { Footer } from "@/components/Footer";
import { fetchPublicSalon, salonPath } from "@/lib/salon";
import { bookingPath } from "@/lib/slug";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const salon = await fetchPublicSalon(slug.toLowerCase());
  if (!salon) return { title: "Salon introuvable" };
  return {
    title: `${salon.name} — choisis ton tatoueur`,
    description: `Choisis ton tatoueur au salon ${salon.name} et envoie ta demande de tatouage en ligne.`,
  };
}

export default async function SalonPage({ params }: Params) {
  const { slug } = await params;
  const lowered = slug.toLowerCase();
  const salon = await fetchPublicSalon(lowered);
  if (!salon) notFound();
  // Même salon, écrit avec des majuscules : on renvoie vers l'adresse officielle.
  if (lowered !== slug) redirect(salonPath(salon.slug));

  return (
    <div>
      <section className="relative overflow-hidden px-6 pb-12 pt-16 text-center">
        <div
          className="absolute inset-0 -z-10 opacity-25"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(200,30,30,0.35), transparent 70%)",
          }}
        />
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="h-5 w-1.5 bg-accent" />
          <span className="font-display text-sm tracking-widest text-muted">
            TATTFLOW
          </span>
        </div>
        <h1 className="mx-auto max-w-2xl font-display text-4xl uppercase leading-tight tracking-tight text-white md:text-6xl">
          {salon.name}
        </h1>
        {salon.city && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted">
            <MapPin size={14} className="text-accent" />
            {salon.city}
          </p>
        )}
        {salon.bio && (
          <p className="mx-auto mt-5 max-w-xl whitespace-pre-line text-balance text-sm leading-relaxed text-foreground/85 md:text-base">
            {salon.bio}
          </p>
        )}
      </section>

      <section className="px-5 pb-16 md:px-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-1 text-center font-display text-2xl text-foreground md:text-3xl">
            Choisis ton tatoueur
          </h2>
          <p className="mb-8 text-center text-sm text-muted">
            Tu envoies ta demande directement au tatoueur de ton choix : il te
            répond avec un devis.
          </p>

          {salon.members.length === 0 ? (
            <p className="text-center text-sm text-muted">
              Les tatoueurs de ce salon arrivent bientôt.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {salon.members.map((m) => (
                <li key={m.id}>
                  <Link
                    href={bookingPath(m.slug)}
                    className="flex h-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-accent/60"
                  >
                    {m.avatarUrl ? (
                      <Image
                        src={m.avatarUrl}
                        alt=""
                        width={64}
                        height={64}
                        className="h-16 w-16 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-800 font-display text-xl text-zinc-300">
                        {m.displayName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-medium text-foreground">
                        {m.displayName}
                      </span>
                      {m.city && (
                        <span className="block truncate text-xs text-muted">
                          {m.city}
                        </span>
                      )}
                      {m.instagramHandle && (
                        <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
                          <AtSign size={11} />
                          {m.instagramHandle.replace(/^@/, "")}
                        </span>
                      )}
                      {m.practicedStyles.length > 0 && (
                        <span className="mt-1.5 block truncate text-xs text-accent">
                          {m.practicedStyles.slice(0, 3).join(" · ")}
                        </span>
                      )}
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
