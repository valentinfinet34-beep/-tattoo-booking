import Link from "next/link";

export default function SalonNotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-5 py-10 text-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="h-5 w-1.5 bg-accent" />
          <span className="font-display text-xl tracking-widest">TATTFLOW</span>
        </div>
        <h1 className="mb-3 font-display text-4xl text-foreground">
          Ce salon est introuvable
        </h1>
        <p className="mb-8 text-sm text-muted">
          Le lien que tu as suivi ne correspond à aucun salon. Il contient
          peut-être une faute de frappe : demande au salon de te renvoyer son
          lien.
        </p>
        <Link href="/" className="btn-primary inline-block">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
