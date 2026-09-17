"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmedPage() {
  const router = useRouter();
  // Lu une seule fois de facon synchrone : evite toute race condition avec
  // les callbacks async de Supabase qui resolvent dans un ordre variable.
  const [isRecovery] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.location.hash.includes("type=recovery") ||
        window.location.search.includes("type=recovery"))
  );
  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "recovery"
  >("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const goToDashboard = () => {
      setStatus("success");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (isRecovery || event === "PASSWORD_RECOVERY") {
        setStatus("recovery");
      } else if (session) {
        goToDashboard();
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        if (isRecovery) {
          setStatus("recovery");
        } else {
          goToDashboard();
        }
      } else {
        setTimeout(() => {
          setStatus((s) => (s === "loading" ? "error" : s));
        }, 3000);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (password.length < 6) {
      setResetError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setResetError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setResetError("Échec de la mise à jour, réessaie.");
      return;
    }

    setResetDone(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-5 py-10 text-center">
      <div className="w-full max-w-sm">
        {status === "loading" && (
          <p className="text-sm text-muted">Confirmation en cours...</p>
        )}
        {status === "success" && (
          <>
            <h1 className="mb-3 text-3xl">Email confirmé !</h1>
            <p className="text-sm text-muted">
              Redirection vers ton dashboard...
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="mb-3 text-3xl">Lien invalide ou expiré</h1>
            <p className="mb-4 text-sm text-muted">
              Réessaie de te connecter, ou redemande un email de
              confirmation.
            </p>
            <Link href="/login" className="btn-primary inline-block">
              Se connecter
            </Link>
          </>
        )}
        {status === "recovery" && !resetDone && (
          <>
            <div className="mb-8 flex items-center justify-center gap-2">
              <div className="h-5 w-1.5 bg-accent" />
              <span className="font-display text-xl tracking-widest">
                TATTFLOW
              </span>
            </div>
            <h1 className="mb-2 text-left text-3xl">Nouveau mot de passe</h1>
            <p className="mb-6 text-left text-sm text-muted">
              Choisis un nouveau mot de passe pour ton compte.
            </p>
            <form
              onSubmit={handleResetSubmit}
              className="card-glass flex flex-col gap-4 text-left"
            >
              <div>
                <label className="mb-1.5 block text-xs text-muted">
                  Nouveau mot de passe
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
              <div>
                <label className="mb-1.5 block text-xs text-muted">
                  Confirme le mot de passe
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                />
              </div>
              {resetError && (
                <p className="text-sm text-red-400">{resetError}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full"
              >
                {submitting
                  ? "Mise à jour..."
                  : "Valider le nouveau mot de passe"}
              </button>
            </form>
          </>
        )}
        {status === "recovery" && resetDone && (
          <>
            <h1 className="mb-3 text-3xl">Mot de passe mis à jour !</h1>
            <p className="text-sm text-muted">
              Redirection vers ton dashboard...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
