"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnconfirmed(false);
    setResendMessage(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      if (signInError.message.toLowerCase().includes("email not confirmed")) {
        setUnconfirmed(true);
        setError("Ton email n'est pas encore confirmé.");
      } else {
        setError("Email ou mot de passe incorrect.");
      }
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
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

      setResendMessage(
        resendError
          ? "Échec de l'envoi, réessaie dans un instant."
          : "Email de confirmation renvoyé !"
      );
    } catch {
      setResendMessage("Échec de l'envoi, réessaie dans un instant.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="h-5 w-1.5 bg-accent" />
          <span className="font-display text-xl tracking-widest">
            STUDIO INK
          </span>
        </div>

        <h1 className="mb-6 text-3xl">Connexion artiste</h1>

        <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-5">
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}

          {unconfirmed && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="btn-secondary text-sm"
              >
                {resending ? "Envoi..." : "Renvoyer l'email de confirmation"}
              </button>
              {resendMessage && (
                <p className="text-xs text-muted">{resendMessage}</p>
              )}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
