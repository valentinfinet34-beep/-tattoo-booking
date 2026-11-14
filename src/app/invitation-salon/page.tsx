import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
