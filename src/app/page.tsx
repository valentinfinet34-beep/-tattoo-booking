import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-5 py-10 text-center">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="h-5 w-1.5 bg-accent" />
          <span className="font-display text-2xl tracking-widest">
            STUDIO INK
          </span>
        </div>

        <h1 className="mb-3 text-4xl">
          Réservation & acomptes pour tatoueurs
        </h1>
        <p className="mb-8 text-sm text-muted">
          Fini les DM Instagram. Donne à tes clients une vraie page de
          réservation, avec acompte automatique par Stripe.
        </p>

        <Link href="/signup" className="btn-primary inline-block">
          Créer mon compte
        </Link>

        <p className="mt-6 text-xs text-muted">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
