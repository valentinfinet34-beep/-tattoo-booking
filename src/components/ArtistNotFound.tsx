import Link from "next/link";

/**
 * Page affichée quand un lien de tatoueur (/book/<pseudo>) ne correspond à
 * personne : un vrai 404, mais avec un message clair pour un client qui
 * arrive depuis Instagram.
 */
export function ArtistNotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-5 py-10 text-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="h-5 w-1.5 bg-accent" />
          <span className="font-display text-xl tracking-widest">TATTFLOW</span>
        </div>

        <h1 className="mb-3 font-display text-4xl text-foreground">
          Ce tatoueur est introuvable
        </h1>
        <p className="mb-6 text-sm text-muted">
          Le lien que tu as suivi ne correspond à aucune page de réservation.
          Il a peut-être changé, ou il contient une faute de frappe.
        </p>

        <ul className="mb-8 flex flex-col gap-2 text-left text-sm text-muted">
          <li className="flex gap-2">
            <span className="text-accent">•</span>
            Vérifie le lien : pas d&apos;espace, pas de lettre en trop.
          </li>
          <li className="flex gap-2">
            <span className="text-accent">•</span>
            Demande à ton tatoueur de te renvoyer son lien à jour.
          </li>
        </ul>

        <Link href="/" className="btn-primary inline-block">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
