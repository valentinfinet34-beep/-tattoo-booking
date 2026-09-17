import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-5 py-10 text-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="h-5 w-1.5 bg-accent" />
          <span className="font-display text-xl tracking-widest">
            TATTFLOW
          </span>
        </div>

        <h1 className="mb-3 font-display text-5xl text-foreground">404</h1>
        <p className="mb-8 text-sm text-muted">
          Cette page n&apos;existe pas ou plus. Vérifie le lien, ou repars de
          l&apos;accueil.
        </p>
        <Link href="/" className="btn-primary inline-block">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
