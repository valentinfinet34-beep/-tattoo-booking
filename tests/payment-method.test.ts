import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as email from "@/lib/email";
import { canReceivePayments, validatePaymentLink } from "@/lib/payment";
import {
  addProject,
  applyMigrations,
  asUser,
  catalogSnapshot,
  createDb,
  readMigration,
  readRollback,
  runAs,
  signup,
} from "./helpers/db";
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
vi.mock("@/lib/email");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "localhost:3000" }),
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

const LINK = "https://paypal.me/tatoueur-a";

describe("lien de paiement : règles de validation", () => {
  it.each([
    ["https://paypal.me/tonnom", true],
    ["  https://www.lydia-app.com/collect/abc?x=1  ", true],
    ["http://paypal.me/tonnom", false],
    ["javascript:alert(1)", false],
    ["data:text/html,<script>1</script>", false],
    ["https://user:motdepasse@paypal.me/x", false],
    ["https://localhost/x", false],
    ["paypal.me/tonnom", false],
    ["https://pay pal.me/x", false],
    ["", false],
    ["https://" + "a".repeat(500) + ".fr", false],
  ])("validatePaymentLink(%j) accepté : %s", (value, ok) => {
    expect(validatePaymentLink(value).ok).toBe(ok);
  });

  it("canReceivePayments : Stripe prêt, lien externe renseigné, ou rien", () => {
    expect(canReceivePayments({ stripe_account_id: "acct", stripe_charges_enabled: true })).toBe(true);
    expect(canReceivePayments({ stripe_account_id: "acct", stripe_charges_enabled: false })).toBe(false);
    expect(canReceivePayments({ payment_method: "external_link", payment_link_url: LINK })).toBe(true);
    expect(canReceivePayments({ payment_method: "external_link", payment_link_url: null })).toBe(false);
    expect(canReceivePayments(null)).toBe(false);
  });
});

describe("migration 0019 : moyen d'encaissement (vrai PostgreSQL)", () => {
  let db: PGlite;
  let A: string;
  let B: string;

  beforeAll(async () => {
    db = await createDb();
    await applyMigrations(db);
    A = await signup(db, { slug: "paiement-a" });
    B = await signup(db, { slug: "paiement-b" });
  });
  afterAll(() => db.close());

  const asA = (sql: string, args: unknown[] = []) => runAs(db, asUser(A), sql, args);

  it("tout le monde reste sur Stripe par défaut (aucun changement pour les comptes existants)", async () => {
    const rows = await db.query<{ payment_method: string; payment_link_url: string | null }>(
      `select payment_method, payment_link_url from public.artists`
    );
    expect(rows.rows.every((r) => r.payment_method === "stripe" && r.payment_link_url === null)).toBe(true);
  });

  it("le tatoueur peut choisir un lien externe https", async () => {
    await asA(`update public.artists set payment_method = 'external_link', payment_link_url = $1 where id = $2`, [LINK, A]);
    const row = await db.query<{ payment_method: string }>(`select payment_method from public.artists where id = $1`, [A]);
    expect(row.rows[0].payment_method).toBe("external_link");
  });

  it.each([
    ["lien externe sans lien", `update public.artists set payment_method = 'external_link', payment_link_url = null where id = $1`],
    ["lien en http", `update public.artists set payment_link_url = 'http://paypal.me/x' where id = $1`],
    ["lien javascript", `update public.artists set payment_link_url = 'javascript:alert(1)' where id = $1`],
    ["lien avec espace", `update public.artists set payment_link_url = 'https://a b.fr' where id = $1`],
    ["moyen inconnu", `update public.artists set payment_method = 'bitcoin' where id = $1`],
  ])("la base refuse : %s", async (_label, sql) => {
    await expect(asA(sql, [A])).rejects.toThrow(/violates check constraint/i);
  });

  it("les colonnes d'abonnement et Stripe restent verrouillées (migration 0017 intacte)", async () => {
    await expect(asA(`update public.artists set subscription_status = 'active' where id = $1`, [A])).rejects.toThrow(/permission denied/i);
    await expect(asA(`update public.artists set stripe_account_id = 'acct_x' where id = $1`, [A])).rejects.toThrow(/permission denied/i);
  });

  it("un tatoueur ne peut pas changer le moyen d'encaissement d'un autre (0 ligne touchée)", async () => {
    const rows = await asA(`update public.artists set payment_method = 'external_link', payment_link_url = $1 where id = $2 returning id`, [LINK, B]);
    expect(rows).toHaveLength(0);
    const b = await db.query<{ payment_method: string }>(`select payment_method from public.artists where id = $1`, [B]);
    expect(b.rows[0].payment_method).toBe("stripe");
  });

  it("le retour arrière rend la base exactement à l'état d'avant 0019, et la migration est rejouable", async () => {
    const fresh = await createDb();
    try {
      await applyMigrations(fresh, { upTo: "0018" });
      const before = await catalogSnapshot(fresh);
      await fresh.exec(readMigration("0019_payment_method.sql"));
      expect(await catalogSnapshot(fresh)).not.toEqual(before);
      await fresh.exec(readRollback("0019_payment_method.down.sql"));
      expect(await catalogSnapshot(fresh)).toEqual(before);
      await fresh.exec(readMigration("0019_payment_method.sql"));
    } finally {
      await fresh.close();
    }
  });
});

describe("paiement par lien externe : routes et isolation", () => {
  let db: PGlite;
  let A: string; // tatoueur avec lien externe
  let B: string; // tatoueur avec Stripe
  let C: string; // tatoueur sans aucun moyen réglé
  let aQuoted: string;
  let aAccepted: string;
  let aPending: string;
  let bAccepted: string;
  let bQuoted: string;
  let cPending: string;

  const params = (id: string) => ({ params: Promise.resolve({ id }) });
  const post = (path: string, body?: unknown) =>
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const statusOf = async (id: string) =>
    (await db.query<{ status: string }>(`select status from public.projects where id = $1`, [id])).rows[0].status;

  beforeAll(async () => {
    db = await createDb();
    await applyMigrations(db);
    A = await signup(db, { slug: "ext-a" });
    B = await signup(db, { slug: "ext-b" });
    C = await signup(db, { slug: "ext-c" });
    await db.query(`update public.artists set payment_method = 'external_link', payment_link_url = $1 where id = $2`, [LINK, A]);
    await db.query(`update public.artists set stripe_account_id = 'acct_b', stripe_charges_enabled = true where id = $1`, [B]);

    aQuoted = await addProject(db, A, { status: "quoted", quoted_price_cents: 20000 });
    aAccepted = await addProject(db, A, { status: "accepted", deposit_amount_cents: 4000, stripe_checkout_url: LINK });
    await db.query(`update public.projects set payment_method = 'external_link' where id = $1`, [aAccepted]);
    aPending = await addProject(db, A, { status: "pending" });
    bAccepted = await addProject(db, B, { status: "accepted", deposit_amount_cents: 4000, stripe_checkout_url: "https://stripe.test/b" });
    bQuoted = await addProject(db, B, { status: "quoted", quoted_price_cents: 20000 });
    cPending = await addProject(db, C, { status: "pending" });
  });
  afterAll(() => db.close());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devis : un tatoueur avec lien externe peut en envoyer un sans compte Stripe", async () => {
    signInAs(db, A);
    const route = await import("@/app/api/projects/[id]/quote/route");
    const res = await route.POST(post(`/api/projects/${aPending}/quote`, { quotedPriceEur: 120, durationHours: 2 }), params(aPending));
    expect(res.status).toBe(200);
    expect(await statusOf(aPending)).toBe("quoted");
    await db.query(`update public.projects set status = 'pending', quoted_price_cents = null where id = $1`, [aPending]);
  });

  it("devis : un tatoueur sans aucun moyen d'encaisser est refusé avec un message clair", async () => {
    signInAs(db, C);
    const route = await import("@/app/api/projects/[id]/quote/route");
    const res = await route.POST(post(`/api/projects/${cPending}/quote`, { quotedPriceEur: 120, durationHours: 2 }), params(cPending));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/comment encaisser/i);
    expect(await statusOf(cPending)).toBe("pending");
  });

  it("acceptation du devis (lien externe) : aucune session Stripe, lien du tatoueur enregistré, email adapté", async () => {
    signInAs(db, null);
    const route = await import("@/app/api/quotes/[id]/accept/route");
    const res = await route.POST(post(`/api/quotes/${aQuoted}/accept`), params(aQuoted));
    expect(res.status).toBe(200);
    expect(stripeCalls.sessions).toHaveLength(0);

    const row = await db.query<{ status: string; payment_method: string; stripe_checkout_url: string; stripe_session_id: string | null }>(
      `select status, payment_method, stripe_checkout_url, stripe_session_id from public.projects where id = $1`, [aQuoted]
    );
    expect(row.rows[0]).toEqual({ status: "accepted", payment_method: "external_link", stripe_checkout_url: LINK, stripe_session_id: null });
    expect(vi.mocked(email.sendDepositLinkEmail).mock.calls[0][0]).toMatchObject({ external: true });
  });

  it("acceptation du devis (Stripe) : comportement inchangé, session Stripe créée sur le compte du tatoueur", async () => {
    signInAs(db, null);
    const route = await import("@/app/api/quotes/[id]/accept/route");
    const res = await route.POST(post(`/api/quotes/${bQuoted}/accept`), params(bQuoted));
    expect(res.status).toBe(200);
    expect(stripeCalls.sessions).toHaveLength(1);
    const row = await db.query<{ payment_method: string; stripe_session_id: string }>(
      `select payment_method, stripe_session_id from public.projects where id = $1`, [bQuoted]
    );
    expect(row.rows[0].payment_method).toBe("stripe");
    expect(row.rows[0].stripe_session_id).toMatch(/^cs_test_/);
    expect(vi.mocked(email.sendDepositLinkEmail).mock.calls[0][0]).toMatchObject({ external: false });
  });

  describe.each([
    { label: "avec les règles de la base (RLS)", withRls: true },
    { label: "SANS les règles de la base : le code seul doit filtrer", withRls: false },
  ])("« J'ai reçu l'acompte » — $label", ({ withRls }) => {
    it("A confirme l'acompte de sa propre demande (lien externe)", async () => {
      signInAs(db, A, { withRls });
      const route = await import("@/app/api/projects/[id]/mark-paid/route");
      const res = await route.POST(post(`/api/projects/${aAccepted}/mark-paid`), params(aAccepted));
      expect(res.status).toBe(200);
      expect(await statusOf(aAccepted)).toBe("deposit_paid");
      await db.query(`update public.projects set status = 'accepted' where id = $1`, [aAccepted]);
    });

    it("A ne peut pas confirmer l'acompte d'une demande d'un autre tatoueur (404, rien ne change)", async () => {
      signInAs(db, A, { withRls });
      const route = await import("@/app/api/projects/[id]/mark-paid/route");
      const before = await statusOf(bAccepted);
      const res = await route.POST(post(`/api/projects/${bAccepted}/mark-paid`), params(bAccepted));
      expect(res.status).toBe(404);
      expect(await statusOf(bAccepted)).toBe(before);
    });

    it("un visiteur non connecté ne peut rien confirmer (401)", async () => {
      signInAs(db, null);
      const route = await import("@/app/api/projects/[id]/mark-paid/route");
      const res = await route.POST(post(`/api/projects/${aAccepted}/mark-paid`), params(aAccepted));
      expect(res.status).toBe(401);
      expect(await statusOf(aAccepted)).toBe("accepted");
    });

    it("on ne peut pas confirmer à la main un acompte Stripe, ni une demande qui n'attend rien", async () => {
      signInAs(db, B, { withRls });
      const route = await import("@/app/api/projects/[id]/mark-paid/route");
      expect((await route.POST(post(`/api/projects/${bAccepted}/mark-paid`), params(bAccepted))).status).toBe(400);
      expect(await statusOf(bAccepted)).toBe("accepted");

      signInAs(db, A, { withRls });
      expect((await route.POST(post(`/api/projects/${aPending}/mark-paid`), params(aPending))).status).toBe(400);
      expect(await statusOf(aPending)).toBe("pending");
    });
  });

  it("réglages : le tatoueur enregistre un lien valide ; un lien dangereux est refusé ; le choix d'un autre n'est pas touché", async () => {
    signInAs(db, C);
    const { updatePaymentMethod } = await import("@/app/dashboard/settings/actions");

    for (const bad of ["http://paypal.me/x", "javascript:alert(1)", "https://u:p@x.fr", ""]) {
      const res = await updatePaymentMethod({ method: "external_link", link: bad });
      expect(res.ok, bad).toBe(false);
    }

    expect(await updatePaymentMethod({ method: "external_link", link: "https://lydia-app.com/collect/xyz" })).toEqual({ ok: true });
    const rows = await db.query<{ id: string; payment_method: string }>(
      `select id, payment_method from public.artists where id = any($1::uuid[])`, [[A, B, C]]
    );
    expect(Object.fromEntries(rows.rows.map((r) => [r.id, r.payment_method]))).toEqual({
      [A]: "external_link",
      [B]: "stripe",
      [C]: "external_link",
    });

    expect(await updatePaymentMethod({ method: "stripe", link: "" })).toEqual({ ok: true });
  });
});
