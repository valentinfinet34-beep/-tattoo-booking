"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });

    // Toujours afficher le meme message, meme si l'email n'existe pas
    // (evite de reveler si une adresse est inscrite ou non).
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="h-5 w-1.5 bg-accent" />
          <span className="font-display text-xl tracking-widest">
            TATTFLOW
          </span>
        </div>

        <h1 className="mb-2 text-3xl">Mot de passe oublié</h1>
        <p className="mb-6 text-sm text-muted">
          Indique ton email, on t&apos;envoie un lien pour en choisir un
          nouveau.
        </p>

        {sent ? (
          <div className="card flex flex-col gap-3 p-5">
            <p className="text-sm text-foreground">
              Si un compte existe avec cette adresse, un email vient d&apos;être
              envoyé avec un lien de réinitialisation.
            </p>
            <p className="text-xs text-muted">
              Pense à vérifier tes spams si tu ne le vois pas d&apos;ici
              quelques minutes.
            </p>
            <Link href="/login" className="btn-secondary mt-2 text-center">
              Retour à la connexion
            </Link>
          </div>
        ) : (
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
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Envoi..." : "Envoyer le lien"}
            </button>
            <Link
              href="/login"
              className="text-center text-xs text-muted hover:text-foreground"
            >
              Retour à la connexion
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
