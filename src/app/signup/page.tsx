"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";

const RESEND_COOLDOWN_SECONDS = 30;

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleNameChange = (value: string) => {
    setDisplayName(value);
    if (!slugEdited) setSlug(slugify(value));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const checkRes = await fetch(`/api/check-slug?slug=${slug}`);
      const checkData = await checkRes.json();

      if (!checkData.available) {
        setError(
          "Ce nom de studio est déjà pris ou invalide (minimum 3 caractères, lettres/chiffres/tirets)."
        );
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName, slug },
        },
      });

      if (signUpError) {
        if (
          signUpError.message.toLowerCase().includes("rate limit") ||
          signUpError.status === 429
        ) {
          setError(
            "Trop de tentatives d'envoi d'email en peu de temps. Réessaie dans 15 à 60 minutes."
          );
        } else if (signUpError.message.includes("already registered")) {
          setError("Un compte existe déjà avec cet email.");
        } else {
          setError("Échec de la création du compte. Réessaie.");
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setPendingConfirmation(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError("Une erreur est survenue, réessaie dans un instant.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMessage(null);

    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (resendError) {
        setResendMessage("Échec de l'envoi, réessaie dans un instant.");
      } else {
        setResendMessage("Email renvoyé !");
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } catch {
      setResendMessage("Échec de l'envoi, réessaie dans un instant.");
    } finally {
      setResending(false);
    }
  };

  if (pendingConfirmation) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-5 py-10 text-center">
        <div className="w-full max-w-sm">
          <h1 className="mb-3 text-3xl">Vérifie ta boîte mail</h1>
          <p className="text-sm text-muted">
            On a envoyé un email de confirmation à <strong>{email}</strong>.
            Clique sur le lien pour activer ton compte, puis connecte-toi.
          </p>

          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-xs text-muted">Rien reçu ?</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="btn-secondary text-sm"
            >
              {resending
                ? "Envoi..."
                : cooldown > 0
                  ? `Renvoyer (${cooldown}s)`
                  : "Renvoyer l'email de confirmation"}
            </button>
            {resendMessage && (
              <p className="text-xs text-muted">{resendMessage}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="h-5 w-1.5 bg-accent" />
          <span className="font-display text-xl tracking-widest">
            STUDIO INK
          </span>
        </div>

        <h1 className="mb-6 text-3xl">Créer mon compte</h1>

        <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs text-muted">
              Nom du studio
            </label>
            <input
              required
              value={displayName}
              onChange={(e) => handleNameChange(e.target.value)}
              className="input-field"
              placeholder="Studio Ink"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-muted">
              Adresse de ta page (modifiable)
            </label>
            <div className="input-field flex items-center gap-1 text-sm text-muted">
              <span>/book/</span>
              <input
                required
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(slugify(e.target.value));
                }}
                className="w-full bg-transparent text-foreground outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-muted">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-muted">
              Mot de passe
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
            />
            <span>
              J&apos;accepte les{" "}
              <Link href="/cgu" target="_blank" className="text-accent hover:underline">
                CGU
              </Link>{" "}
              et la{" "}
              <Link
                href="/confidentialite"
                target="_blank"
                className="text-accent hover:underline"
              >
                politique de confidentialité
              </Link>
              .
            </span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !acceptedTerms}
            className="btn-primary w-full"
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>
      </div>
    </div>
  );
}
