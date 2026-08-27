import Link from "next/link";

export const metadata = {
  title: "Conditions générales — TattFlow",
};

export default function CguPage() {
  return (
    <div className="mx-auto min-h-full max-w-2xl px-5 py-12">
      <Link href="/" className="text-xs text-muted hover:text-foreground">
        ← Retour à l&apos;accueil
      </Link>

      <h1 className="mb-1 mt-4 text-3xl text-foreground">
        Conditions générales d&apos;utilisation et de vente
      </h1>
      <p className="mb-8 text-xs text-muted">Dernière mise à jour : 19 août 2026</p>

      <div className="legal-content">
        <h2>1. Objet</h2>
        <p>
          TattFlow (« la Plateforme ») est un service en ligne (SaaS) édité
          par <mark>[NOM ET PRÉNOM OU DÉNOMINATION SOCIALE]</mark> permettant
          aux artistes tatoueurs (« l&apos;Artiste » ou « l&apos;Utilisateur »)
          de disposer d&apos;une page de réservation en ligne, de recevoir et
          gérer des demandes de projets, d&apos;envoyer des devis, et de
          collecter des acomptes auprès de leurs clients (« le Client final »)
          via un lien de paiement sécurisé.
        </p>
        <p>
          Les présentes conditions générales d&apos;utilisation et de vente
          (« CGU ») régissent l&apos;accès et l&apos;utilisation de la
          Plateforme par l&apos;Artiste. Elles constituent un contrat entre
          l&apos;Artiste et l&apos;éditeur de la Plateforme. Toute inscription
          sur la Plateforme implique l&apos;acceptation pleine et entière des
          présentes CGU.
        </p>

        <h2>2. Définitions</h2>
        <ul>
          <li>
            <strong>Plateforme :</strong> le service TattFlow accessible
            depuis le Site et ses sous-domaines de réservation.
          </li>
          <li>
            <strong>Artiste :</strong> le professionnel du tatouage qui
            souscrit un abonnement à la Plateforme.
          </li>
          <li>
            <strong>Client final :</strong> la personne qui soumet une
            demande de tatouage via la page de réservation publique d&apos;un
            Artiste.
          </li>
          <li>
            <strong>Devis :</strong> le prix estimé communiqué par
            l&apos;Artiste au Client final via la Plateforme.
          </li>
          <li>
            <strong>Acompte :</strong> la somme versée par le Client final
            pour confirmer un rendez-vous, dont le montant est déterminé par
            l&apos;Artiste dans ses paramètres.
          </li>
        </ul>

        <h2>3. Description du service</h2>
        <p>La Plateforme permet notamment à l&apos;Artiste de :</p>
        <ul>
          <li>disposer d&apos;une page de réservation publique personnalisable ;</li>
          <li>recevoir les demandes de projet de ses Clients finaux ;</li>
          <li>envoyer des devis et gérer leur acceptation ou leur refus ;</li>
          <li>
            générer automatiquement un lien de paiement d&apos;acompte, via
            Stripe, lorsqu&apos;un Client final accepte un devis ;
          </li>
          <li>
            recevoir les acomptes directement sur son propre compte Stripe ;
          </li>
          <li>gérer son agenda et ses disponibilités.</li>
        </ul>
        <p>
          La Plateforme agit exclusivement en tant que <strong>prestataire
          technique</strong> mettant à disposition un outil de gestion. Elle
          n&apos;est partie à aucun contrat de prestation de tatouage conclu
          entre l&apos;Artiste et son Client final, et n&apos;intervient pas
          dans la réalisation de la prestation artistique elle-même.
        </p>

        <h2>4. Inscription et compte Artiste</h2>
        <p>
          L&apos;inscription est réservée aux professionnels majeurs
          disposant de la capacité juridique de contracter. L&apos;Artiste
          s&apos;engage à fournir des informations exactes lors de son
          inscription et à les maintenir à jour. Il est seul responsable de
          la confidentialité de ses identifiants de connexion.
        </p>

        <h2>5. Abonnement et tarifs</h2>
        <p>
          L&apos;accès à la Plateforme est proposé sous forme d&apos;abonnement
          mensuel, selon la formule choisie par l&apos;Artiste (les tarifs en
          vigueur sont affichés sur la page d&apos;inscription et dans
          l&apos;espace « Paramètres »), précédé d&apos;une période
          d&apos;essai gratuite de 14 jours. L&apos;abonnement se renouvelle
          automatiquement chaque mois jusqu&apos;à résiliation par
          l&apos;Artiste, à tout moment, depuis son espace « Paramètres ».
        </p>
        <p>
          La résiliation prend effet à la fin de la période déjà payée ; aucun
          remboursement au prorata n&apos;est effectué pour le mois en cours,
          sauf disposition légale impérative contraire.
        </p>
        <p>
          Les paiements de l&apos;abonnement sont traités par Stripe. En cas
          d&apos;échec de paiement, l&apos;accès aux fonctionnalités de la
          Plateforme (hors page Paramètres) peut être suspendu jusqu&apos;à
          régularisation.
        </p>
        <p>
          L&apos;éditeur se réserve le droit de modifier ses tarifs, moyennant
          un préavis raisonnable communiqué par email, sans effet rétroactif
          sur les mois déjà facturés.
        </p>

        <h2>6. Acomptes des Clients finaux</h2>
        <p>
          Les acomptes versés par les Clients finaux sont traités via Stripe
          Connect et créditent <strong>directement le compte Stripe propre de
          l&apos;Artiste</strong>. La Plateforme ne détient, ne séquestre et
          ne reverse à aucun moment les fonds correspondants ; elle
          n&apos;agit pas comme établissement de paiement. À ce jour, aucune
          commission n&apos;est prélevée par la Plateforme sur les acomptes.
        </p>
        <p>
          L&apos;Artiste demeure seul responsable, vis-à-vis de son Client
          final, du respect des règles applicables à sa propre activité
          (droit de la consommation, obligations fiscales, facturation), la
          Plateforme n&apos;étant qu&apos;un intermédiaire technique de mise
          en relation et d&apos;encaissement.
        </p>

        <h2>7. Politique d&apos;annulation</h2>
        <p>
          Avant tout paiement d&apos;acompte, le Client final doit
          expressément accepter les conditions d&apos;annulation suivantes,
          rappelées sur la page de paiement :
        </p>
        <ul>
          <li>
            si le Client final annule le rendez-vous, l&apos;acompte
            n&apos;est pas remboursable ;
          </li>
          <li>
            si l&apos;Artiste annule le rendez-vous, l&apos;acompte est
            intégralement remboursé sous 5 à 7 jours.
          </li>
        </ul>
        <p>
          L&apos;Artiste s&apos;engage à respecter cette politique, qui fait
          partie intégrante des conditions proposées à ses Clients finaux via
          la Plateforme.
        </p>

        <h2>8. Obligations de l&apos;Artiste</h2>
        <p>L&apos;Artiste s&apos;engage à :</p>
        <ul>
          <li>
            n&apos;utiliser la Plateforme que dans le cadre de son activité
            professionnelle de tatoueur ;
          </li>
          <li>
            ne publier que des contenus (photos, textes) dont il détient les
            droits ou l&apos;autorisation de diffusion ;
          </li>
          <li>
            ne pas publier de contenu illicite, injurieux, discriminatoire ou
            portant atteinte aux droits de tiers ;
          </li>
          <li>
            fournir des informations exactes dans ses devis et sa page de
            réservation.
          </li>
        </ul>
        <p>
          Tout manquement peut entraîner la suspension ou la résiliation du
          compte, sans préjudice d&apos;éventuelles poursuites.
        </p>

        <h2>9. Propriété intellectuelle</h2>
        <p>
          La marque TattFlow, le logiciel, son code source et son design
          restent la propriété exclusive de l&apos;éditeur. L&apos;Artiste
          conserve l&apos;entière propriété des contenus qu&apos;il publie
          (photos de réalisations, textes de présentation) et en concède à
          l&apos;éditeur un droit d&apos;usage limité aux besoins du service.
        </p>

        <h2>10. Données personnelles</h2>
        <p>
          Le traitement des données personnelles de l&apos;Artiste et de ses
          Clients finaux est décrit dans notre{" "}
          <Link href="/confidentialite">politique de confidentialité</Link>.
        </p>

        <h2>11. Disponibilité du service</h2>
        <p>
          L&apos;éditeur s&apos;efforce d&apos;assurer une disponibilité
          continue de la Plateforme mais ne garantit pas une disponibilité
          ininterrompue. Des interruptions pour maintenance, mise à jour ou
          cas de force majeure peuvent survenir sans engager sa
          responsabilité.
        </p>

        <h2>12. Responsabilité</h2>
        <p>
          La responsabilité de l&apos;éditeur ne saurait être engagée en cas
          de mauvaise exécution imputable à l&apos;Artiste, à un tiers
          (Stripe, opérateur de messagerie du Client final) ou à un cas de
          force majeure. La responsabilité de l&apos;éditeur, si elle devait
          être retenue, est limitée aux sommes effectivement perçues au
          titre de l&apos;abonnement au cours des douze derniers mois.
        </p>

        <h2>13. Résiliation</h2>
        <p>
          L&apos;Artiste peut résilier son abonnement à tout moment depuis
          son espace Paramètres. L&apos;éditeur peut suspendre ou résilier un
          compte en cas de manquement grave aux présentes CGU, après mise en
          demeure restée sans effet lorsque la situation le permet.
        </p>

        <h2>14. Modification des CGU</h2>
        <p>
          L&apos;éditeur peut modifier les présentes CGU à tout moment. Les
          Artistes seront informés de toute modification substantielle par
          email ou notification sur la Plateforme. La poursuite de
          l&apos;utilisation du service après modification vaut acceptation
          des nouvelles CGU.
        </p>

        <h2>15. Droit applicable et litiges</h2>
        <p>
          Les présentes CGU sont soumises au droit français. En cas de
          litige, les parties rechercheront une solution amiable avant toute
          action judiciaire. À défaut d&apos;accord amiable, les tribunaux
          français compétents seront seuls saisis.
        </p>
      </div>
    </div>
  );
}
