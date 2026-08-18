"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmedPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) goToDashboard();
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        goToDashboard();
      } else {
        setTimeout(() => {
          setStatus((s) => (s === "loading" ? "error" : s));
        }, 3000);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

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
      </div>
    </div>
  );
}
