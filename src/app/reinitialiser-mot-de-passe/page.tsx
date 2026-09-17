"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setStatus("ready");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStatus("ready");
      } else {
        setTimeout(() => {
          setStatus((s) => (s === "loading" ? "error" : s));
        }, 3000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setSubmitting(false);

    if (updateError) {
      setError("Échec de la mise à jour, réessaie.");
      return;
    }

    setDone(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-5 py-10 text-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="h-5 w-1.5 bg-accent" />
          <span className="font-display text-xl tracking-widest">
            TATTFLOW
          </span>
        </div>

        {status === "loading" && (
          <p className="text-sm text-muted">Vérification du lien...</p>
        )}

        {status === "error" && (
          <>
            <h1 className="mb-3 text-3xl">Lien invalide ou expiré</h1>
            <p className="mb-4 text-sm text-muted">
              Redemande un nouveau lien de réinitialisation.
            </p>
            <Link href="/mot-de-passe-oublie" className="btn-primary inline-block">
              Réessayer
            </Link>
          </>
        )}

        {status === "ready" && !done && (
          <>
            <h1 className="mb-2 text-left text-3xl">Nouveau mot de passe</h1>
            <p className="mb-6 text-left text-sm text-muted">
              Choisis un nouveau mot de passe pour ton compte.
            </p>
            <form
              onSubmit={handleSubmit}
              className="card flex flex-col gap-4 p-5 text-left"
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
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full"
              >
                {submitting ? "Mise à jour..." : "Valider le nouveau mot de passe"}
              </button>
            </form>
          </>
        )}

        {done && (
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
