"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";

interface OnboardingCardProps {
  slug: string;
  stripeConnected: boolean;
  pageCustomized: boolean;
}

export function OnboardingCard({
  slug,
  stripeConnected,
  pageCustomized,
}: OnboardingCardProps) {
  const [copied, setCopied] = useState(false);
  const bookingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tattooer/${slug}`
      : `/tattooer/${slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // navigateur sans support clipboard : ignore silencieusement
    }
  };

  if (stripeConnected) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 shadow-2xl backdrop-blur-md transition-all hover:border-red-500/40">
        <p className="mb-2 text-xs text-zinc-500">
          Ton lien de réservation — mets-le en bio Instagram
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-md bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
            {bookingUrl}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copier le lien"
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copié" : "Copier"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-accent/30 bg-zinc-900/80 p-5 shadow-2xl backdrop-blur-md">
      <p className="mb-4 font-display text-lg tracking-wide text-zinc-100">
        Mise en route
      </p>
      <div className="flex flex-col gap-3">
        <ChecklistItem
          done={stripeConnected}
          title="Connecter mon compte Stripe"
          description="Obligatoire pour pouvoir encaisser les acomptes de tes clients."
          href="/dashboard/settings#stripe"
          cta="Connecter"
        />
        <ChecklistItem
          done={pageCustomized}
          title="Personnaliser ma page"
          description="Ta photo, ta couleur — optionnel mais recommandé."
          href="/dashboard/settings#page-client"
          cta="Personnaliser"
        />
        <ChecklistItem
          done={false}
          title="Partager mon lien"
          description={bookingUrl}
          href="#"
          cta={copied ? "Copié !" : "Copier"}
          onAction={handleCopy}
        />
      </div>
    </div>
  );
}

function ChecklistItem({
  done,
  title,
  description,
  href,
  cta,
  onAction,
}: {
  done: boolean;
  title: string;
  description: string;
  href: string;
  cta: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
          done
            ? "border-success bg-success/15 text-success"
            : "border-zinc-700 text-zinc-600"
        }`}
      >
        {done && <Check size={14} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">{title}</p>
        <p className="truncate text-xs text-zinc-500">{description}</p>
      </div>
      {!done &&
        (onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="shrink-0 text-xs text-accent hover:underline"
          >
            {cta}
          </button>
        ) : (
          <Link href={href} className="shrink-0 text-xs text-accent hover:underline">
            {cta}
          </Link>
        ))}
    </div>
  );
}
