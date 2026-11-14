import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMySalon } from "@/lib/salon";
import { JoinSalonButton } from "./JoinSalonButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invitation à rejoindre un salon",
  robots: { index: false, follow: false },
};

export default async function SalonInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = typeof token === "string" && /^[a-f0-9]{64}$/.test(token);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const mySalon = user ? await getMySalon(supabase, user.id) : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10 text-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="h-5 w-1.5 bg-accent" />
          <span className="font-display text-xl tracking-widest">TATTFLOW</span>
        </div>
        <h1 className="mb-3 font-display text-3xl text-foreground">
          Rejoindre un salon
        </h1>

        {!valid ? (
          <>
            <p className="mb-6 text-sm text-muted">
              Ce lien d&apos;invitation n&apos;est pas valide. Demande au salon de
              t&apos;en envoyer un nouveau.
            </p>
            <Link href="/" className="btn-primary inline-block">
              Retour à l&apos;accueil
            </Link>
          </>
        ) : user && mySalon ? (
          <>
            <p className="mb-3 text-sm text-muted">
              {mySalon.isOwner
                ? `Tu es le propriétaire du salon « ${mySalon.name} ».`
                : `Tu fais déjà partie du salon « ${mySalon.name} ».`}{" "}
              Un tatoueur ne peut être que dans un seul salon.
            </p>
            <p className="mb-6 text-sm text-muted">
              {mySalon.isOwner
                ? "Pour rejoindre un autre salon, supprime d’abord le tien. Tes demandes, devis et paiements ne sont pas touchés."
                : "Pour rejoindre ce nouveau salon, quitte d’abord le tien. Tes demandes, devis et paiements ne sont pas touchés."}
            </p>
            <Link href="/dashboard/settings#salon" className="btn-primary inline-block">
              {mySalon.isOwner ? "Gérer ou supprimer mon salon" : "Quitter mon salon"}
            </Link>
            <p className="mt-4 text-xs text-muted">
              Ensuite, rouvre ton lien d’invitation.
            </p>
          </>
        ) : user ? (
          <>
            <p className="mb-6 text-sm text-muted">
              Un salon t&apos;invite à rejoindre son équipe sur TattFlow. Tes
              demandes, ton agenda et tes encaissements restent à toi : le
              salon ne voit pas tes demandes.
            </p>
            <JoinSalonButton token={token!} />
          </>
        ) : (
          <>
            <p className="mb-6 text-sm text-muted">
              Un salon t&apos;invite à rejoindre son équipe. Connecte-toi ou crée
              ton compte tatoueur, puis rouvre ce lien d&apos;invitation.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/login" className="btn-primary">
                Me connecter
              </Link>
              <Link href="/signup" className="btn-secondary">
                Créer mon compte
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
