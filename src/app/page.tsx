import Link from "next/link";
import {
  CalendarCheck,
  CreditCard,
  LayoutDashboard,
  Mail,
  Palette,
  Smartphone,
} from "lucide-react";

const STEPS = [
  {
    title: "Le client réserve",
    description:
      "Il remplit un formulaire sur ta page : projet, taille, emplacement, date et heure — plus besoin de deviner via DM.",
  },
  {
    title: "Tu valides",
    description:
      "Tu regardes la demande, fixes le montant de l'acompte et la durée du RDV. Le lien de paiement se génère tout seul.",
  },
  {
    title: "C'est réglé",
    description:
      "Le client reçoit le lien par email, paie, et le RDV se confirme automatiquement sur ton dashboard.",
  },
];

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Dashboard clair",
    description: "Toutes tes demandes triées par statut, en un coup d'œil.",
  },
  {
    icon: CalendarCheck,
    title: "Disponibilités réelles",
    description:
      "Bloque tes jours pleins, les créneaux déjà pris ne sont plus proposés.",
  },
  {
    icon: CreditCard,
    title: "Paiement automatique",
    description: "Acompte encaissé par Stripe, aucune vérification manuelle.",
  },
  {
    icon: Palette,
    title: "Ta page, ton style",
    description: "Ta photo, ta couleur — pas un template générique.",
  },
  {
    icon: Mail,
    title: "Emails automatiques",
    description: "Le client reçoit son lien de paiement sans que tu bouges.",
  },
  {
    icon: Smartphone,
    title: "Sur ton téléphone",
    description: "Installable comme une app, aucune galère technique.",
  },
];

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-col items-center px-5 py-10">
      <div className="fixed inset-0 -z-10 bg-background">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 50% at 15% -10%, rgba(200,30,30,0.18), transparent), radial-gradient(ellipse 55% 45% at 100% 110%, rgba(217,119,6,0.10), transparent)",
          }}
        />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1.5 bg-accent" />
            <span className="font-display text-xl tracking-widest">
              STUDIO INK
            </span>
          </div>
          <Link href="/login" className="text-xs text-muted hover:text-foreground">
            Se connecter
          </Link>
        </div>

        <div className="mb-16 text-center">
          <h1 className="mb-4 text-5xl leading-[0.95]">
            Fini les DM Instagram
          </h1>
          <p className="mb-8 text-sm text-muted">
            Donne à tes clients une vraie page de réservation, avec acompte
            automatique par Stripe. Toi, tu valides. Le reste se fait tout
            seul.
          </p>
          <Link href="/signup" className="btn-primary inline-block w-full">
            Créer mon compte
          </Link>
          <Link
            href="/demo"
            className="mt-2 inline-block w-full text-xs text-muted hover:text-foreground"
          >
            Voir une démo avant de s&apos;inscrire →
          </Link>
        </div>

        <div className="mb-16">
          <h2 className="mb-6 text-center text-2xl">Comment ça marche</h2>
          <div className="flex flex-col gap-6">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 font-display text-accent">
                  {i + 1}
                </div>
                <div>
                  <p className="mb-1 font-medium">{step.title}</p>
                  <p className="text-sm text-muted">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-16">
          <h2 className="mb-6 text-center text-2xl">Ce que tu obtiens</h2>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="card flex flex-col gap-2 p-4"
              >
                <feature.icon size={18} className="text-accent" />
                <p className="text-sm font-medium">{feature.title}</p>
                <p className="text-xs text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-lg">Prêt à arrêter de gérer ça dans tes DM ?</p>
          <Link href="/signup" className="btn-primary inline-block w-full">
            Créer mon compte
          </Link>
        </div>
      </div>
    </div>
  );
}
