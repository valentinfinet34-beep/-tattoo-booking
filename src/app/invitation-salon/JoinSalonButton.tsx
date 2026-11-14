"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptSalonInvite } from "@/app/dashboard/settings/salon-actions";

export function JoinSalonButton({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await acceptSalonInvite(token);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push("/dashboard/settings#salon");
    } catch {
      setError("Une erreur est survenue, réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={join} disabled={busy} className="btn-primary w-full">
        {busy ? "Un instant..." : "Rejoindre le salon"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
