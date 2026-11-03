import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as email from "@/lib/email";
import {
  addProject,
  applyMigrations,
  asAnon,
  asUser,
  createDb,
  runAs,
  signup,
} from "./helpers/db";
import { collectStrings, signInAs, state, stripeCalls } from "./helpers/mocks";

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

// Marqueurs faciles à repérer si une donnée du tatoueur B fuit dans une page.
const A_NAME = "AliceTestA";
const B_NAME = "BrunoTestB";
const B_EMAIL = "bruno@b-secret.test";
const B_DATE = "2099-03-03";

let db: PGlite;
let A: string;
let B: string;
let aPending: string;
let aPaid: string;
let bPending: string;
let bQuoted: string;
let bAccepted: string;
let bPaid: string;

const bSnapshot = async () => ({
  projects: (await db.query(`select * from public.projects where artist_id = $1 order by id`, [B])).rows,
  blocked: (await db.query(`select * from public.blocked_dates where artist_id = $1 order by id`, [B])).rows,
  artist: (await db.query(`select * from public.artists where id = $1`, [B])).rows,
});

const json = async (res: Response) => res.json().catch(() => null);
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const post = (path: string, body?: unknown) =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeAll(async () => {
  db = await createDb();
  await applyMigrations(db);

  A = await signup(db, { slug: "tatoueur-a", displayName: "Studio A" });
  B = await signup(db, { slug: "tatoueur-b", displayName: "Studio B" });
  await db.query(
    `update public.artists set stripe_account_id = 'acct_test', stripe_charges_enabled = true,
       subscription_status = 'active', subscription_plan = 'pro'`
  );

  aPending = await addProject(db, A, { first_name: A_NAME, status: "pending" });
  aPaid = await addProject(db, A, {
    first_name: A_NAME,
    status: "deposit_paid",
    deposit_amount_cents: 5000,
    scheduled_start_time: "10:00",
    duration_hours: 2,
    preferred_date: "2099-06-02",
  });
  bPending = await addProject(db, B, { first_name: B_NAME, email: B_EMAIL, status: "pending" });
  bQuoted = await addProject(db, B, { first_name: B_NAME, email: B_EMAIL, status: "quoted", quoted_price_cents: 30000 });
  bAccepted = await addProject(db, B, {
    first_name: B_NAME,
    email: B_EMAIL,
    status: "accepted",
    deposit_amount_cents: 6000,
    stripe_checkout_url: "https://stripe.test/pay/b",
  });
  bPaid = await addProject(db, B, {
    first_name: B_NAME,
    email: B_EMAIL,
    status: "deposit_paid",
    deposit_amount_cents: 6000,
    scheduled_start_time: "14:00",
    duration_hours: 2,
    preferred_date: "2099-06-03",
  });
  await db.query(`insert into public.blocked_dates (artist_id, blocked_date) values ($1, $2)`, [B, B_DATE]);
});
afterAll(() => db.close());

describe("règles de la base : le tatoueur A face aux données du tatoueur B (SQL direct)", () => {
  const asA = (sql: string, args: unknown[] = []) => runAs(db, asUser(A), sql, args);

  it("A ne voit que ses propres demandes, jamais celles de B", async () => {
    const rows = await asA(`select id, artist_id from public.projects`);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.artist_id === A)).toBe(true);
  });

  it.each([
    ["lire une demande de B par son identifiant", () => `select id from public.projects where id = '${bPaid}'`],
    ["lire les demandes de B par son identifiant de tatoueur", () => `select id from public.projects where artist_id = '${B}'`],
    ["lire la fiche (facturation comprise) de B", () => `select * from public.artists where id = '${B}'`],
    ["lire les jours bloqués de B", () => `select * from public.blocked_dates where artist_id = '${B}'`],
  ])("A ne peut pas %s", async (_label, sql) => {
    expect(await asA(sql())).toHaveLength(0);
  });

  it("A ne peut modifier ni la fiche de B, ni ses demandes, ni ses jours bloqués (0 ligne touchée)", async () => {
    const before = await bSnapshot();
    expect(await asA(`update public.artists set display_name = 'Piraté' where id = $1 returning id`, [B])).toHaveLength(0);
    expect(await asA(`update public.projects set status = 'declined' where artist_id = $1 returning id`, [B])).toHaveLength(0);
    expect(await asA(`update public.projects set status = 'declined' where id = $1 returning id`, [bPaid])).toHaveLength(0);
    expect(await asA(`delete from public.blocked_dates where artist_id = $1 returning id`, [B])).toHaveLength(0);
    expect(await asA(`delete from public.projects where artist_id = $1 returning id`, [B])).toHaveLength(0);
    expect(await bSnapshot()).toEqual(before);
  });

  it("A ne peut pas créer une demande ou un jour bloqué au nom de B", async () => {
    await expect(
      asA(
        `insert into public.projects (artist_id, first_name, last_name, email, phone, description, body_location, preferred_date, time_slot)
         values ($1, 'Faux', 'Faux', 'f@f.test', '0600000000', 'description assez longue', 'Bras', '2099-01-05', '10:00')`,
        [B]
      )
    ).rejects.toThrow(/row-level security/i);
    await expect(
      asA(`insert into public.blocked_dates (artist_id, blocked_date) values ($1, '2099-04-04')`, [B])
    ).rejects.toThrow(/row-level security/i);
  });

  it("A ne peut pas « donner » une de ses demandes à B (ni en prendre une à B) en changeant artist_id", async () => {
    await expect(
      asA(`update public.projects set artist_id = $1 where id = $2`, [B, aPending])
    ).rejects.toThrow(/row-level security/i);
    const owner = await db.query<{ artist_id: string }>(`select artist_id from public.projects where id = $1`, [aPending]);
    expect(owner.rows[0].artist_id).toBe(A);

    expect(await asA(`update public.projects set artist_id = $1 where id = $2 returning id`, [A, bPending])).toHaveLength(0);
  });

  it("témoin : A peut modifier ses propres données (le test n'échoue pas pour une mauvaise raison)", async () => {
    expect(
      await asA(`update public.projects set no_show = true where id = $1 returning id`, [aPaid])
    ).toHaveLength(1);
    await asA(`update public.projects set no_show = false where id = $1`, [aPaid]);
  });

  it("un visiteur non connecté ne lit rien de la base", async () => {
    for (const table of ["projects", "artists", "blocked_dates"]) {
      expect(await runAs(db, asAnon, `select * from public.${table}`)).toHaveLength(0);
    }
  });
});

describe.each([
  { label: "avec les règles de la base (RLS)", withRls: true },
  { label: "SANS les règles de la base : le code seul doit filtrer par tatoueur", withRls: false },
])("le tatoueur A contre B par les routes, actions et pages — $label", ({ withRls }) => {
  beforeEach(() => {
    signInAs(db, A, { withRls });
    vi.clearAllMocks();
  });

  describe("routes API réservées au tatoueur", () => {
    it.each([
      ["devis", "quote", { quotedPriceEur: 100, durationHours: 2 }],
      ["refus", "decline", { message: "non" }],
      ["acceptation", "accept", { depositAmountEur: 50, scheduledStartTime: "10:00", durationHours: 2 }],
    ])("A ne peut pas faire un %s sur une demande de B", async (_label, action, body) => {
      const route = await import(`@/app/api/projects/[id]/${action}/route`);

      for (const target of [bPending, bQuoted, bAccepted, bPaid]) {
        const before = await bSnapshot();
        const res = await route.POST(post(`/api/projects/${target}/${action}`, body), params(target));

        expect(res.status, `${action} sur ${target}`).toBe(404);
        expect(await bSnapshot()).toEqual(before);
      }

      expect(vi.mocked(email.sendQuoteEmail)).not.toHaveBeenCalled();
      expect(vi.mocked(email.sendDeclineEmail)).not.toHaveBeenCalled();
      expect(vi.mocked(email.sendDepositLinkEmail)).not.toHaveBeenCalled();
      expect(stripeCalls.sessions).toHaveLength(0);
    });

    it("témoin : A peut envoyer un devis sur SA propre demande", async () => {
      const route = await import("@/app/api/projects/[id]/quote/route");
      const res = await route.POST(post(`/api/projects/${aPending}/quote`, { quotedPriceEur: 150, durationHours: 2 }), params(aPending));
      expect(res.status).toBe(200);

      const row = await db.query<{ status: string }>(`select status from public.projects where id = $1`, [aPending]);
      expect(row.rows[0].status).toBe("quoted");
      await db.query(`update public.projects set status = 'pending', quoted_price_cents = null where id = $1`, [aPending]);
    });

    it("la création manuelle d'une demande est toujours rattachée à A (aucun identifiant de tatoueur dans la requête)", async () => {
      const route = await import("@/app/api/projects/manual/route");
      const res = await route.POST(
        post("/api/projects/manual", {
          firstName: "Manuel",
          lastName: "Test",
          email: "manuel@test.test",
          phone: "0600000000",
          description: "Une description assez longue",
          bodyLocation: "Bras",
          sizeCategory: "Petit (< 5 cm)",
          style: "Minimaliste",
          colorMode: "Couleur",
          preferredDate: "2099-07-07",
          preferredTime: "11:00",
          durationHours: 2,
          depositAmountEur: 40,
          artist_id: B,
          artistId: B,
        })
      );
      expect(res.status).toBe(200);
      const rows = await db.query<{ artist_id: string }>(`select artist_id from public.projects where first_name = 'Manuel'`);
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0].artist_id).toBe(A);
      await db.query(`delete from public.projects where first_name = 'Manuel'`);
    });
  });

  describe("actions du tableau de bord", () => {
    it("setNoShow ne modifie pas la demande de B", async () => {
      const { setNoShow } = await import("@/app/dashboard/agenda/actions");
      const before = await bSnapshot();
      await setNoShow(bPaid, true);
      expect(await bSnapshot()).toEqual(before);
    });

    it("unblockDate ne supprime pas le jour bloqué de B, même à la même date", async () => {
      const { unblockDate } = await import("@/app/dashboard/availability/actions");
      const before = await bSnapshot();
      await unblockDate(B_DATE);
      expect(await bSnapshot()).toEqual(before);
    });

    it("blockDate bloque un jour pour A seulement", async () => {
      const { blockDate, unblockDate } = await import("@/app/dashboard/availability/actions");
      const before = await bSnapshot();
      await blockDate("2099-08-08");
      const rows = await db.query<{ artist_id: string }>(`select artist_id from public.blocked_dates where blocked_date = '2099-08-08'`);
      expect(rows.rows.map((r) => r.artist_id)).toEqual([A]);
      expect(await bSnapshot()).toEqual(before);
      await unblockDate("2099-08-08");
    });

    it("changeSlug ne peut pas prendre le pseudo de B", async () => {
      const { changeSlug } = await import("@/app/dashboard/settings/actions");
      const result = await changeSlug("tatoueur-b");
      expect(result.ok).toBe(false);
      const slugs = await db.query<{ id: string; slug: string }>(`select id, slug from public.artists where id = any($1::uuid[])`, [[A, B]]);
      expect(Object.fromEntries(slugs.rows.map((r) => [r.id, r.slug]))).toEqual({ [A]: "tatoueur-a", [B]: "tatoueur-b" });
    });
  });

  describe("pages du tableau de bord", () => {
    it("/dashboard n'affiche que les demandes de A", async () => {
      const { default: DashboardPage } = await import("@/app/dashboard/page");
      const strings = collectStrings(await DashboardPage()).join(" | ");

      expect(strings).toContain(A_NAME);
      expect(strings).not.toContain(B_NAME);
      expect(strings).not.toContain(B_EMAIL);
      expect(strings).not.toContain(bPaid);

      const reads = state.server!.log.filter((q) => q.table === "projects" && q.op === "select");
      expect(reads.map((q) => q.rowCount)).toEqual([2]);
    });

    it("/dashboard/agenda n'affiche que les rendez-vous de A", async () => {
      const { default: AgendaPage } = await import("@/app/dashboard/agenda/page");
      const strings = collectStrings(await AgendaPage()).join(" | ");

      expect(strings).toContain(A_NAME);
      expect(strings).not.toContain(B_NAME);
      expect(strings).not.toContain(B_EMAIL);

      const reads = state.server!.log.filter((q) => q.table === "projects" && q.op === "select");
      expect(reads.reduce((sum, q) => sum + q.rowCount, 0)).toBe(1);
    });

    it("/dashboard/stats ne compte que les demandes de A", async () => {
      const { default: StatsPage } = await import("@/app/dashboard/stats/page");
      await StatsPage();

      const reads = state.server!.log.filter((q) => q.table === "projects" && q.op === "select");
      expect(reads.map((q) => q.rowCount)).toEqual([2]);
    });

    it("/dashboard/new ne lit que les créneaux de A", async () => {
      const { default: NewProjectPage } = await import("@/app/dashboard/new/page");
      const strings = collectStrings(await NewProjectPage()).join(" | ");
      expect(strings).not.toContain(B_DATE);
    });
  });
});
