import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TRIAL_DAYS } from "@/lib/plan";
import { applyMigrations, createDb, signup } from "./helpers/db";
import { signInAs, stripeCalls } from "./helpers/mocks";

vi.mock("@/lib/supabase/server", async () => {
  const { state } = await import("./helpers/mocks");
  return { createClient: async () => state.server };
});
vi.mock("@/lib/supabase/admin", async () => {
  const { state } = await import("./helpers/mocks");
  return { createAdminClient: () => state.admin };
});
vi.mock("@/lib/stripe", async () => {
  const { fakeStripe } = await import("./helpers/mocks");
  return { getStripe: () => fakeStripe };
});
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "localhost:3000" }),
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

type CheckoutParams = {
  payment_method_collection?: string;
  subscription_data?: {
    trial_period_days?: number;
    trial_settings?: { end_behavior?: { missing_payment_method?: string } };
  };
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const read = (file: string) => readFileSync(file, "utf8");

describe("essai gratuit : 7 jours, sans carte bancaire", () => {
  let db: PGlite;
  let newArtist: string;
  let returningArtist: string;

  beforeAll(async () => {
    db = await createDb();
    await applyMigrations(db);
    newArtist = await signup(db, { slug: "essai-nouveau", displayName: "Nouveau" });
    returningArtist = await signup(db, { slug: "essai-revenu", displayName: "Revenu" });
    await db.query(
      `update public.artists set stripe_subscription_id = 'sub_ancien', stripe_customer_id = 'cus_ancien' where id = $1`,
      [returningArtist]
    );
  });
  afterAll(() => db.close());

  beforeEach(() => {
    vi.stubEnv("STRIPE_PRICE_SINGLE_ID", "price_test");
  });

  async function startCheckout(userId: string): Promise<CheckoutParams> {
    signInAs(db, userId);
    const { startSubscriptionCheckout } = await import("@/app/dashboard/billing/actions");
    // redirect() interrompt la fonction en levant une exception : c'est normal.
    await expect(startSubscriptionCheckout()).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    expect(stripeCalls.sessions).toHaveLength(1);
    return stripeCalls.sessions[0] as CheckoutParams;
  }

  it("un nouveau tatoueur : essai de 7 jours, carte demandée seulement si nécessaire (jamais pendant l'essai)", async () => {
    const params = await startCheckout(newArtist);
    expect(params.payment_method_collection).toBe("if_required");
    expect(params.subscription_data?.trial_period_days).toBe(7);
    expect(params.subscription_data?.trial_period_days).toBe(TRIAL_DAYS);
  });

  it("sans carte à la fin de l'essai, l'abonnement s'arrête au lieu de tenter un prélèvement", async () => {
    const params = await startCheckout(newArtist);
    expect(params.subscription_data?.trial_settings?.end_behavior?.missing_payment_method).toBe("cancel");
  });

  it("un tatoueur qui a déjà eu un abonnement n'a plus d'essai : abonnement normal, avec carte", async () => {
    const params = await startCheckout(returningArtist);
    expect(params.payment_method_collection).toBe("always");
    expect(params.subscription_data?.trial_period_days).toBeUndefined();
  });

  it("le compte reste fonctionnel pendant l'essai sans carte : statut « trialing » accepté partout", () => {
    const sources: Record<string, string> = {
      plan: read("src/lib/plan.ts"),
      middleware: read("src/lib/supabase/middleware.ts"),
      subscription: read("src/components/dashboard/SubscriptionSection.tsx"),
    };
    for (const [name, code] of Object.entries(sources)) {
      expect(code, name).toContain('"trialing"');
    }
    // Aucun contrôle ne regarde si une carte est enregistrée.
    for (const file of ["src/lib/supabase/middleware.ts", "src/lib/plan.ts"]) {
      expect(read(file), file).not.toMatch(/default_payment_method|payment_method_id|has_card/i);
    }
  });
});

describe("cohérence des textes et de la durée de l'essai", () => {
  const files = sourceFiles("src");

  it("la durée d'essai est définie une seule fois, à 7 jours", () => {
    expect(TRIAL_DAYS).toBe(7);
    const definitions = files.filter((f) => /export const TRIAL_DAYS\s*=/.test(read(f)));
    expect(definitions.map((f) => path.basename(f))).toEqual(["plan.ts"]);
  });

  it("aucun « 14 jours » ni durée d'essai écrite en dur dans le code", () => {
    for (const file of files) {
      const code = read(file);
      expect(code, file).not.toMatch(/\b14\s*(jours|j\b|-day)/i);
      expect(code, file).not.toMatch(/trial_period_days:\s*\d/);
      // « N jours d'essai / offerts » : N doit venir de TRIAL_DAYS, pas d'un chiffre écrit à la main.
      expect(code, file).not.toMatch(/\b\d+\s*jours\s*(d(&apos;|['’])essai|offerts)/i);
    }
  });

  it("aucun texte ne dit qu'une carte est demandée pour l'essai", () => {
    const forbidden = [
      /une carte est demandée/i,
      /carte bancaire est\s+demandée/i,
      /carte est demandée/i,
      /premier prélèvement/i,
      /rien n(&apos;|['’])est prélevé/i,
      /avec carte bancaire/i,
    ];
    for (const file of files) {
      const code = read(file);
      for (const pattern of forbidden) expect(code, `${file} : ${pattern}`).not.toMatch(pattern);
    }
  });

  it.each([
    "src/app/page.tsx",
    "src/app/signup/page.tsx",
    "src/components/dashboard/SubscriptionSection.tsx",
    "src/app/cgu/page.tsx",
  ])("%s annonce bien « sans carte bancaire »", (file) => {
    expect(read(file)).toMatch(/sans carte|aucune carte bancaire/i);
  });

  it("les emails automatiques ne parlent ni de l'essai ni de carte bancaire pour l'abonnement", () => {
    const emails = read("src/lib/email.ts");
    expect(emails).not.toMatch(/\bessai\b/i);
    expect(emails).not.toMatch(/carte bancaire/i);
  });
});
