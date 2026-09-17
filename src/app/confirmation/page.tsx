import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-5 py-10 text-center">
      <div className="card-glass flex w-full max-w-sm flex-col items-center gap-4 p-8">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 shadow-glow">
          <CheckCircle2 className="text-accent" size={32} />
        </span>
        <h1 className="text-3xl">Demande envoyée</h1>
        <p className="text-sm text-muted">
          Ta demande est en cours de validation par l&apos;artiste. Tu
          recevras un email dès qu&apos;elle sera acceptée, avec le lien pour
          régler l&apos;acompte et confirmer ton rendez-vous.
        </p>
        <Link
          href={slug ? `/tattooer/${slug}` : "/"}
          className="btn-secondary mt-2 w-full text-center"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
