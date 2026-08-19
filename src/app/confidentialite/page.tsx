import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité — TattFlow",
};

export default function ConfidentialitePage() {
  return (
    <div className="mx-auto min-h-full max-w-2xl px-5 py-12">
      <Link href="/" className="text-xs text-muted hover:text-foreground">
        ← Retour à l&apos;accueil
      </Link>

      <h1 className="mb-1 mt-4 text-3xl text-foreground">
        Politique de confidentialité
      </h1>
      <p className="mb-8 text-xs text-muted">Dernière mise à jour : 19 août 2026</p>

      <div className="legal-content">
        <p>
          La présente politique explique comment TattFlow (« nous ») collecte
          et traite les données personnelles des artistes tatoueurs inscrits
          sur la Plateforme (« Artiste ») et des personnes qui soumettent une
          demande via une page de réservation (« Client final »),
          conformément au Règlement (UE) 2016/679 (« RGPD ») et à la loi
          Informatique et Libertés.
        </p>

        <h2>1. Responsable de traitement</h2>
        <p>
          Le responsable du traitement est{" "}
          <mark>[NOM ET PRÉNOM OU DÉNOMINATION SOCIALE]</mark>, joignable à
          l&apos;adresse <a href="mailto:contact@tattflow.fr">contact@tattflow.fr</a>{" "}
          <mark>[à remplacer par votre adresse de contact définitive]</mark>.
        </p>

        <h2>2. Données que nous collectons</h2>
        <h3>Concernant l&apos;Artiste (compte utilisateur)</h3>
        <ul>
          <li>Identité : nom/pseudo, ville, photo de profil, biographie, lien Instagram ;</li>
          <li>Compte : adresse email, mot de passe (stocké de façon chiffrée, jamais en clair) ;</li>
          <li>
            Informations de paiement et d&apos;abonnement : gérées directement
            par Stripe (nous ne stockons jamais de numéro de carte bancaire) ;
          </li>
          <li>
            Paramètres d&apos;activité : styles pratiqués, disponibilités,
            réglages d&apos;acompte et de notification.
          </li>
        </ul>
        <h3>Concernant le Client final (formulaire de réservation)</h3>
        <ul>
          <li>Identité et contact : prénom, nom, email, téléphone ;</li>
          <li>
            Détails du projet : zone du corps, taille, style, couleur,
            description libre, photo(s) de référence ;
          </li>
          <li>Créneau souhaité : date et heure de rendez-vous ;</li>
          <li>
            Données de paiement de l&apos;acompte : traitées exclusivement par
            Stripe, jamais stockées sur nos serveurs.
          </li>
        </ul>

        <h2>3. Finalités du traitement</h2>
        <ul>
          <li>créer et gérer le compte de l&apos;Artiste et son abonnement ;</li>
          <li>
            permettre la mise en relation entre l&apos;Artiste et le Client
            final (transmission des demandes, devis, confirmations) ;
          </li>
          <li>générer et sécuriser les liens de paiement d&apos;acompte ;</li>
          <li>
            envoyer les emails transactionnels nécessaires (confirmation de
            demande, devis, lien de paiement, rappels de rendez-vous) ;
          </li>
          <li>assurer la sécurité de la Plateforme et prévenir la fraude ;</li>
          <li>
            répondre à nos obligations légales et comptables.
          </li>
        </ul>

        <h2>4. Base légale</h2>
        <p>
          Les traitements reposent sur l&apos;exécution du contrat (CGU pour
          l&apos;Artiste, mise en relation pour le Client final), notre
          intérêt légitime (sécurité, amélioration du service) et, le cas
          échéant, le consentement (par exemple pour certaines communications
          non essentielles).
        </p>

        <h2>5. Destinataires des données</h2>
        <p>Vos données peuvent être transmises aux prestataires suivants, dans la stricte limite nécessaire à leur mission :</p>
        <ul>
          <li>
            <strong>Supabase</strong> (hébergement de la base de données et
            des fichiers, région Irlande, Union européenne) ;
          </li>
          <li>
            <strong>Stripe</strong> (traitement des paiements d&apos;acompte
            et des abonnements, certifié PCI-DSS) ;
          </li>
          <li>
            <strong>Resend</strong> (envoi des emails transactionnels) ;
          </li>
          <li>
            <strong>Vercel</strong> (hébergement technique du site).
          </li>
        </ul>
        <p>
          Ces prestataires sont situés aux États-Unis. Les transferts de
          données hors de l&apos;Union européenne qui en résultent sont
          encadrés par des clauses contractuelles types de la Commission
          européenne et/ou une adhésion au Data Privacy Framework UE-USA,
          garantissant un niveau de protection adéquat.
        </p>
        <p>
          Les données de l&apos;Artiste et du Client final ne sont jamais
          vendues à des tiers ni utilisées à des fins publicitaires.
        </p>

        <h2>6. Durée de conservation</h2>
        <ul>
          <li>
            Données du compte Artiste : pendant toute la durée du compte, puis
            archivées ou supprimées dans un délai raisonnable après
            résiliation, sous réserve des obligations légales de conservation
            (comptabilité, notamment) ;
          </li>
          <li>
            Données d&apos;un Client final : conservées le temps nécessaire à
            la gestion de la demande et du rendez-vous, puis supprimées ou
            anonymisées, sauf obligation légale de conservation plus longue
            (facturation).
          </li>
        </ul>

        <h2>7. Sécurité</h2>
        <p>
          L&apos;accès aux données est protégé par chiffrement en transit
          (HTTPS), hachage des mots de passe, et des règles d&apos;accès au
          niveau de la base de données (Row Level Security) garantissant
          qu&apos;un Artiste ne peut consulter que ses propres données et
          celles de ses Clients finaux.
        </p>

        <h2>8. Vos droits</h2>
        <p>
          Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès,
          de rectification, d&apos;effacement, de limitation, de portabilité
          et d&apos;opposition concernant vos données personnelles. Vous
          pouvez exercer ces droits en écrivant à{" "}
          <a href="mailto:contact@tattflow.fr">contact@tattflow.fr</a>. Nous
          nous engageons à répondre dans un délai d&apos;un mois.
        </p>
        <p>
          Si vous estimez, après nous avoir contactés, que vos droits ne sont
          pas respectés, vous pouvez introduire une réclamation auprès de la
          CNIL (
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
            www.cnil.fr
          </a>
          ).
        </p>

        <h2>9. Cookies</h2>
        <p>
          Nous utilisons uniquement des cookies strictement nécessaires au
          fonctionnement du service (maintien de la session de connexion de
          l&apos;Artiste). Aucun cookie de mesure d&apos;audience ou
          publicitaire tiers n&apos;est déposé à ce jour ; en cas
          d&apos;évolution, votre consentement vous sera demandé
          conformément à la réglementation.
        </p>

        <h2>10. Mineurs</h2>
        <p>
          La Plateforme s&apos;adresse à des professionnels majeurs et à
          leurs clients. Le tatouage étant légalement encadré et réservé aux
          personnes majeures en France (sauf autorisation parentale prévue
          par la loi), nous invitons les Artistes à s&apos;assurer du respect
          de cette réglementation dans leur propre pratique.
        </p>

        <h2>11. Modification de cette politique</h2>
        <p>
          Cette politique peut être mise à jour pour refléter des évolutions
          légales ou fonctionnelles. La date de dernière mise à jour figure
          en haut de cette page. En cas de changement substantiel, les
          Artistes en seront informés par email.
        </p>
      </div>
    </div>
  );
}
