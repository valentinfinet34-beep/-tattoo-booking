import Link from "next/link";

export const metadata = {
  title: "Mentions légales — TattFlow",
};

export default function MentionsLegalesPage() {
  return (
    <div className="mx-auto min-h-full max-w-2xl px-5 py-12">
      <Link href="/" className="text-xs text-muted hover:text-foreground">
        ← Retour à l&apos;accueil
      </Link>

      <h1 className="mb-1 mt-4 text-3xl text-foreground">Mentions légales</h1>
      <p className="mb-8 text-xs text-muted">Dernière mise à jour : 19 août 2026</p>

      <div className="legal-content">
        <p>
          Conformément aux dispositions des articles 6-III et 19 de la loi
          n°2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie
          numérique (LCEN), il est porté à la connaissance des utilisateurs
          et visiteurs du site TattFlow (ci-après « le Site ») les présentes
          mentions légales.
        </p>

        <h2>1. Éditeur du site</h2>
        <p>
          Le Site est édité par <mark>[NOM ET PRÉNOM OU DÉNOMINATION SOCIALE]</mark>,{" "}
          <mark>[forme juridique — ex : entrepreneur individuel / auto-entrepreneur / SASU]</mark>,
          immatriculé(e) sous le numéro SIRET <mark>[NUMÉRO SIRET]</mark>, dont le
          siège / l&apos;adresse de correspondance est situé(e) <mark>[ADRESSE COMPLÈTE]</mark>.
        </p>
        <p>
          Numéro de TVA intracommunautaire : <mark>[N° TVA le cas échéant]</mark>.
        </p>
        <p>
          Directeur de la publication : <mark>[NOM DU RESPONSABLE DE PUBLICATION]</mark>.
        </p>
        <p>
          Contact :{" "}
          <a href="mailto:contact@tattflow.fr">contact@tattflow.fr</a>{" "}
          <mark>[à remplacer par votre adresse de contact définitive]</mark>.
        </p>

        <h2>2. Hébergement</h2>
        <p>
          <strong>Hébergement du site (frontend) :</strong> Vercel Inc., 340 S
          Lemon Ave #4133, Walnut, CA 91789, États-Unis —{" "}
          <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
            vercel.com
          </a>
          .
        </p>
        <p>
          <strong>Hébergement de la base de données et des fichiers :</strong>{" "}
          Supabase Inc., dont l&apos;instance utilisée par le Site est hébergée
          dans l&apos;Union européenne (région Irlande, AWS eu-west-1) —{" "}
          <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
            supabase.com
          </a>
          .
        </p>
        <p>
          <strong>Traitement des paiements :</strong> Stripe (Stripe Payments
          Europe, Ltd pour les utilisateurs de l&apos;UE) —{" "}
          <a href="https://stripe.com" target="_blank" rel="noopener noreferrer">
            stripe.com
          </a>
          .
        </p>
        <p>
          <strong>Envoi des emails transactionnels :</strong> Resend, Inc. —{" "}
          <a href="https://resend.com" target="_blank" rel="noopener noreferrer">
            resend.com
          </a>
          .
        </p>

        <h2>3. Accès au site</h2>
        <p>
          Le Site est accessible par tout endroit, 24h/24, 7j/7 sauf cas de
          force majeure, interruption programmée ou non pour maintenance, ou
          panne. L&apos;éditeur ne pourra être tenu responsable de tout
          dommage, quelle qu&apos;en soit la nature, résultant d&apos;une
          indisponibilité du Site.
        </p>

        <h2>4. Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble des éléments du Site (structure, textes, logos,
          logiciels, bases de données) est la propriété exclusive de
          l&apos;éditeur ou de ses partenaires, sauf mention contraire, et est
          protégé par le Code de la propriété intellectuelle. Toute
          reproduction, représentation, modification ou exploitation non
          autorisée de tout ou partie de ces éléments est interdite.
        </p>
        <p>
          Les photographies et contenus déposés par les artistes tatoueurs
          (photo de couverture, galerie de réalisations, description) restent
          leur propriété exclusive. En les publiant sur le Site, l&apos;artiste
          garantit détenir les droits nécessaires et concède à
          l&apos;éditeur un droit d&apos;affichage strictement limité au
          fonctionnement du service.
        </p>

        <h2>5. Données personnelles</h2>
        <p>
          Le traitement des données personnelles collectées via le Site est
          décrit dans notre{" "}
          <Link href="/confidentialite">politique de confidentialité</Link>.
        </p>

        <h2>6. Cookies</h2>
        <p>
          Le Site utilise uniquement des cookies strictement nécessaires à
          son fonctionnement (maintien de la session de connexion). Aucun
          cookie publicitaire ou de mesure d&apos;audience tiers n&apos;est
          déposé à ce jour.
        </p>

        <h2>7. Liens hypertextes</h2>
        <p>
          Le Site peut contenir des liens vers d&apos;autres sites (Stripe,
          Instagram, etc.). L&apos;éditeur n&apos;exerce aucun contrôle sur
          ces sites et décline toute responsabilité quant à leur contenu.
        </p>

        <h2>8. Droit applicable</h2>
        <p>
          Les présentes mentions légales sont soumises au droit français. En
          cas de litige, et à défaut de résolution amiable, les tribunaux
          français seront seuls compétents.
        </p>
      </div>
    </div>
  );
}
