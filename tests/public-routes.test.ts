import { randomUUID } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as email from "@/lib/email";
import { validateSlug } from "@/lib/slug";
import {
  addProject,
  applyMigrations,
  asService,
  createDb,
  runAs,
  signup,
} from "./helpers/db";
import { collectStrings, signInAs, stripeCalls } from "./helpers/mocks";

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

const B_EMAIL = "bruno@b-secret.test";
const B_NAME = "BrunoTestB";

let db: PGlite;
let A: string;
let B: string;
let C: string;
let D: string;
let bQuoted: string;
let bAccepted: string;
let bDeclined: string;

const REDIRECT = (path: string) =>
  expect.objectContaining({ digest: expect.stringMatching(new RegExp(`^NEXT_REDIRECT;[a-z]+;${path};30[78]`)) });
const NOT_FOUND = expect.objectContaining({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });

const routeParams = (id: string) => ({ params: Promise.resolve({ id }) });
const slugParams = (slug: string) => ({ params: Promise.resolve({ slug }) });

function post(path: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const aTuesday = (() => {
  let d = new Date("2099-01-05T00:00:00");
  while (d.getDay() !== 2) d = new Date(d.getTime() + 24 * 3600 * 1000);
  return d.toISOString().split("T")[0];
})();

function requestForm(slug: string, extra: Record<string, string> = {}) {
  const form = new FormData();
  const fields: Record<string, string> = {
    firstName: "Nouveau",
    lastName: "Client",
    email: "nouveau@client.test",
    phone: "0600000000",
    description: "Une description assez longue",
    bodyLocation: "Bras",
    sizeCategory: "Petit (< 5 cm)",
    style: "Minimaliste",
    colorMode: "Couleur",
    preferredDate: aTuesday,
    preferredTime: "10:00",
    website: "",
    artistSlug: slug,
    ...extra,
  };
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return new Request("http://localhost/api/requests", { method: "POST", body: form });
}

const count = async (table: string) =>
  Number((await db.query<{ n: string }>(`select count(*)::int as n from public.${table}`)).rows[0].n);

beforeAll(async () => {
  db = await createDb();
  await applyMigrations(db);

  A = await signup(db, { slug: "tatoueur-a", displayName: "Studio A" });
  B = await signup(db, { slug: "tatoueur-b", displayName: "Studio B" });
  C = await signup(db, { slug: "ancien-nom", displayName: "Studio C" });
  D = await signup(db, { slug: "nom-expire", displayName: "Studio D" });
  await db.query(
    `update public.artists set stripe_account_id = 'acct_test', stripe_charges_enabled = true`
  );

  await runAs(db, asService, `select public.change_artist_slug($1, 'nouveau-nom')`, [C]);
  await runAs(db, asService, `select public.change_artist_slug($1, 'autre-nom')`, [D]);
  await db.query(`update public.artist_slug_history set expires_at = now() - interval '1 day' where old_slug = 'nom-expire'`);

  bQuoted = await addProject(db, B, { first_name: B_NAME, email: B_EMAIL, status: "quoted", quoted_price_cents: 30000 });
  bAccepted = await addProject(db, B, {
    first_name: B_NAME,
    email: B_EMAIL,
    status: "accepted",
    deposit_amount_cents: 6000,
    scheduled_start_time: "14:00",
    duration_hours: 2,
    stripe_checkout_url: "https://stripe.test/pay/b",
  });
  bDeclined = await addProject(db, B, { first_name: B_NAME, email: B_EMAIL, status: "declined" });
});
afterAll(() => db.close());

beforeEach(() => {
  signInAs(db, null);
  vi.clearAllMocks();
});

describe("identifiants devinés ou piégés sur les liens secrets des clients", () => {
  const randomId = () => randomUUID();
  const garbage = ["pas-un-uuid", "' or '1'='1", "*", "../" + "x".repeat(8), "%00", "0".repeat(300)];

  it("des UUID au hasard ne donnent accès à rien (404, aucune écriture, aucun paiement)", async () => {
    const accept = await import("@/app/api/quotes/[id]/accept/route");
    const decline = await import("@/app/api/quotes/[id]/decline/route");
    const terms = await import("@/app/api/projects/[id]/accept-terms/route");
    const reschedule = await import("@/app/api/projects/[id]/reschedule/route");

    const before = (await db.query(`select * from public.projects order by id`)).rows;

    for (let i = 0; i < 10; i++) {
      const id = randomId();
      expect((await accept.POST(post(`/api/quotes/${id}/accept`), routeParams(id))).status).toBe(404);
      expect((await decline.POST(post(`/api/quotes/${id}/decline`), routeParams(id))).status).toBe(404);
      expect((await terms.POST(post(`/api/projects/${id}/accept-terms`), routeParams(id))).status).toBe(404);
      expect(
        (await reschedule.POST(post(`/api/projects/${id}/reschedule`, { preferredDate: aTuesday, preferredTime: "10:00" }), routeParams(id))).status
      ).toBe(404);
    }

    expect((await db.query(`select * from public.projects order by id`)).rows).toEqual(before);
    expect(stripeCalls.sessions).toHaveLength(0);
    expect(vi.mocked(email.sendDepositLinkEmail)).not.toHaveBeenCalled();
  });

  it.each(garbage)("l'identifiant piégé %j est refusé proprement, sans erreur serveur", async (id) => {
    const accept = await import("@/app/api/quotes/[id]/accept/route");
    const terms = await import("@/app/api/projects/[id]/accept-terms/route");
    const before = (await db.query(`select * from public.projects order by id`)).rows;

    expect((await accept.POST(post(`/api/quotes/x/accept`), routeParams(id))).status).toBe(404);
    expect((await terms.POST(post(`/api/projects/x/accept-terms`), routeParams(id))).status).toBe(404);

    expect((await db.query(`select * from public.projects order by id`)).rows).toEqual(before);
  });

  it("les pages /pay, /quote et /reschedule renvoient un 404 pour un identifiant inconnu ou piégé", async () => {
    const { default: PayPage } = await import("@/app/pay/[id]/page");
    const { default: QuotePage } = await import("@/app/quote/[id]/page");
    const { default: ReschedulePage } = await import("@/app/reschedule/[id]/page");

    for (const id of [randomId(), ...garbage]) {
      await expect(PayPage(routeParams(id))).rejects.toEqual(NOT_FOUND);
      await expect(QuotePage({ ...routeParams(id), searchParams: Promise.resolve({}) })).rejects.toEqual(NOT_FOUND);
      await expect(ReschedulePage(routeParams(id))).rejects.toEqual(NOT_FOUND);
    }
  });

  it("un tatoueur connecté n'a aucun passe-droit sur les liens secrets des clients d'un autre", async () => {
    signInAs(db, A);
    const { default: PayPage } = await import("@/app/pay/[id]/page");
    // Un identifiant qui n'existe pas : A n'a aucun moyen de lister ceux de B.
    await expect(PayPage(routeParams(randomId()))).rejects.toEqual(NOT_FOUND);
  });

  it("les pages à lien secret n'exposent que le strict nécessaire (jamais email, téléphone, description)", async () => {
    const { default: PayPage } = await import("@/app/pay/[id]/page");
    const { default: QuotePage } = await import("@/app/quote/[id]/page");

    const pay = collectStrings(await PayPage(routeParams(bAccepted))).join(" | ");
    expect(pay).toContain(B_NAME);
    for (const secret of [B_EMAIL, "0600000000", "Description de test"]) {
      expect(pay).not.toContain(secret);
    }

    const quote = collectStrings(await QuotePage({ ...routeParams(bQuoted), searchParams: Promise.resolve({}) })).join(" | ");
    expect(quote).toContain(B_NAME);
    for (const secret of [B_EMAIL, "0600000000", "Description de test"]) {
      expect(quote).not.toContain(secret);
    }
  });

  it("une demande refusée ne peut être reprogrammée qu'avec son propre identifiant, et reste chez B", async () => {
    const reschedule = await import("@/app/api/projects/[id]/reschedule/route");
    const res = await reschedule.POST(
      post(`/api/projects/${bDeclined}/reschedule`, { preferredDate: aTuesday, preferredTime: "11:00" }),
      routeParams(bDeclined)
    );
    expect(res.status).toBe(200);
    const row = await db.query<{ artist_id: string }>(`select artist_id from public.projects where id = $1`, [bDeclined]);
    expect(row.rows[0].artist_id).toBe(B);
    await db.query(`update public.projects set status = 'declined' where id = $1`, [bDeclined]);
  });
});

describe("pages /book/[slug] et /tattooer/[slug]", () => {
  it("un pseudo connu affiche la page du bon tatoueur", async () => {
    const { default: BookingPage } = await import("@/app/book/[slug]/page");
    const strings = collectStrings(await BookingPage(slugParams("tatoueur-a"))).join(" | ");
    expect(strings).toContain("tatoueur-a");
    expect(strings).not.toContain("tatoueur-b");
  });

  it.each([
    ["inconnu", "ce-pseudo-nexiste-pas"],
    ["réservé non attribué", "admin"],
    ["mal formé", "mon studio"],
    ["tentative de remontée de dossier", "../admin"],
    ["octet nul", "%00"],
    ["très long", "x".repeat(500)],
    ["ancien pseudo expiré", "nom-expire"],
  ])("pseudo %s -> vrai 404", async (_label, slug) => {
    const { default: BookingPage } = await import("@/app/book/[slug]/page");
    const { default: TattooerPage } = await import("@/app/tattooer/[slug]/page");
    await expect(BookingPage(slugParams(slug))).rejects.toEqual(NOT_FOUND);
    await expect(TattooerPage(slugParams(slug))).rejects.toEqual(NOT_FOUND);
  });

  it("une majuscule dans le lien redirige vers le lien exact", async () => {
    const { default: BookingPage } = await import("@/app/book/[slug]/page");
    await expect(BookingPage(slugParams("Tatoueur-A"))).rejects.toEqual(REDIRECT("/book/tatoueur-a"));
  });

  it("l'ancien pseudo (moins de 90 jours) redirige vers le pseudo actuel, sur /book et /tattooer", async () => {
    const { default: BookingPage } = await import("@/app/book/[slug]/page");
    const { default: TattooerPage } = await import("@/app/tattooer/[slug]/page");
    await expect(BookingPage(slugParams("ancien-nom"))).rejects.toEqual(REDIRECT("/book/nouveau-nom"));
    await expect(TattooerPage(slugParams("ancien-nom"))).rejects.toEqual(REDIRECT("/tattooer/nouveau-nom"));
    // Et le nouveau pseudo marche.
    const { default: BookingPageAgain } = await import("@/app/book/[slug]/page");
    await expect(BookingPageAgain(slugParams("nouveau-nom"))).resolves.toBeTruthy();
  });

  it("l'aperçu de partage est propre à chaque tatoueur, et vide pour un inconnu", async () => {
    const { generateMetadata } = await import("@/app/book/[slug]/page");
    const known = await generateMetadata(slugParams("tatoueur-b"));
    expect(known.title).toBe("Réserver chez Studio B");
    expect(await generateMetadata(slugParams("inconnu-total"))).toEqual({});
  });
});

describe("API publiques par pseudo", () => {
  it("/api/availability : pseudo connu, ancien pseudo, inconnu", async () => {
    const { GET } = await import("@/app/api/availability/route");
    const ask = async (slug: string) =>
      (await GET(new Request(`http://localhost/api/availability?date=${aTuesday}&slug=${slug}`))).json();

    expect((await ask("tatoueur-a")).slots.length).toBeGreaterThan(0);
    expect((await ask("ancien-nom")).slots.length).toBeGreaterThan(0);
    expect(await ask("ce-pseudo-nexiste-pas")).toEqual({ slots: [] });
    expect(Object.keys(await ask("tatoueur-b"))).toEqual(["slots"]);
  });

  describe("/api/requests : la demande atterrit chez le bon tatoueur, et chez lui seulement", () => {
    it("pseudo de A -> demande chez A, notification à A seulement, un identifiant de B dans le formulaire est ignoré", async () => {
      const { POST } = await import("@/app/api/requests/route");
      const before = await count("projects");

      const res = await POST(requestForm("tatoueur-a", { artist_id: B, artistId: B, artist_slug: "tatoueur-b" }));
      expect(res.status).toBe(201);
      expect(await count("projects")).toBe(before + 1);

      const row = await db.query<{ artist_id: string }>(`select artist_id from public.projects where first_name = 'Nouveau'`);
      expect(row.rows.map((r) => r.artist_id)).toEqual([A]);

      const notified = vi.mocked(email.sendNewRequestEmail).mock.calls.map((c) => c[0].to);
      expect(notified).toHaveLength(1);
      expect(notified[0]).toBe((await db.query<{ email: string }>(`select email from auth.users where id = $1`, [A])).rows[0].email);

      await db.query(`delete from public.projects where first_name = 'Nouveau'`);
    });

    it("ancien pseudo de C -> la demande arrive chez C (le formulaire ouvert avant le changement continue de marcher)", async () => {
      const { POST } = await import("@/app/api/requests/route");
      const res = await POST(requestForm("ancien-nom"));
      expect(res.status).toBe(201);
      const row = await db.query<{ artist_id: string }>(`select artist_id from public.projects where first_name = 'Nouveau'`);
      expect(row.rows.map((r) => r.artist_id)).toEqual([C]);
      await db.query(`delete from public.projects where first_name = 'Nouveau'`);
    });

    it.each(["ce-pseudo-nexiste-pas", "nom-expire", "admin", "../admin"])(
      "pseudo %j -> 404 « Studio introuvable », rien n'est enregistré, personne n'est prévenu",
      async (slug) => {
        const { POST } = await import("@/app/api/requests/route");
        const before = await count("projects");
        const res = await POST(requestForm(slug));
        expect(res.status).toBe(404);
        expect(await count("projects")).toBe(before);
        expect(vi.mocked(email.sendNewRequestEmail)).not.toHaveBeenCalled();
      }
    );

    it("sans pseudo -> 400", async () => {
      const { POST } = await import("@/app/api/requests/route");
      expect((await POST(requestForm(""))).status).toBe(400);
    });
  });

  describe("/api/check-slug", () => {
    const check = async (slug: string) => {
      const { GET } = await import("@/app/api/check-slug/route");
      return (await GET(new Request(`http://localhost/api/check-slug?slug=${encodeURIComponent(slug)}`))).json();
    };

    it("pseudo libre", async () => {
      expect(await check("studio-libre")).toMatchObject({ available: true });
    });

    it.each([
      ["admin", "reserved"],
      ["tattflow", "reserved"],
      ["dashboard", "reserved"],
      ["tatoueur-a", "taken"],
      ["ancien-nom", "held"],
      ["ab", "too_short"],
      ["x".repeat(31), "too_long"],
      ["Mon Studio", "invalid_format"],
      ["mon_studio", "invalid_format"],
      ["étoile", "invalid_format"],
    ])("%j est refusé : %s, avec un message et des suggestions valides et libres", async (slug, reason) => {
      const result = await check(slug);
      expect(result.available).toBe(false);
      expect(result.reason).toBe(reason);
      expect(result.message).toEqual(expect.any(String));
      expect(result.suggestions.length).toBeGreaterThan(0);
      for (const suggestion of result.suggestions) {
        expect(validateSlug(suggestion)).toBeNull();
        expect(suggestion).not.toBe(slug);
      }
      // Aucune suggestion ne propose un pseudo déjà pris ou retenu.
      expect(result.suggestions).not.toContain("tatoueur-a");
      expect(result.suggestions).not.toContain("ancien-nom");
    });

    it("l'ancien pseudo expiré redevient disponible", async () => {
      expect(await check("nom-expire")).toMatchObject({ available: true });
    });

    it("un tatoueur connecté peut garder son pseudo, reprendre un ancien, mais pas prendre celui d'un autre", async () => {
      signInAs(db, A);
      expect(await check("tatoueur-a")).toMatchObject({ available: true });
      expect(await check("tatoueur-b")).toMatchObject({ available: false, reason: "taken" });

      signInAs(db, C);
      expect(await check("ancien-nom")).toMatchObject({ available: true });
      expect(await check("nouveau-nom")).toMatchObject({ available: true });
      signInAs(db, A);
      expect(await check("ancien-nom")).toMatchObject({ available: false, reason: "held" });
    });
  });
});

describe("changement de pseudo par le tatoueur (action serveur)", () => {
  it("le tatoueur change son lien : l'ancien redirige, personne d'autre ne peut le prendre, rien ne bouge chez les autres", async () => {
    signInAs(db, A);
    const { changeSlug } = await import("@/app/dashboard/settings/actions");
    const others = (await db.query(`select id, slug from public.artists where id <> $1 order by id`, [A])).rows;

    expect(await changeSlug("studio-a-final")).toEqual({ ok: true, slug: "studio-a-final" });
    expect((await db.query<{ slug: string }>(`select slug from public.artists where id = $1`, [A])).rows[0].slug).toBe("studio-a-final");
    expect((await db.query(`select id, slug from public.artists where id <> $1 order by id`, [A])).rows).toEqual(others);

    const { default: BookingPage } = await import("@/app/book/[slug]/page");
    await expect(BookingPage(slugParams("tatoueur-a"))).rejects.toEqual(REDIRECT("/book/studio-a-final"));

    signInAs(db, B);
    const taken = await changeSlug("tatoueur-a");
    expect(taken.ok).toBe(false);

    // Remet A dans son état d'origine.
    signInAs(db, A);
    expect(await changeSlug("tatoueur-a")).toEqual({ ok: true, slug: "tatoueur-a" });
  });

  it.each([
    ["réservé", "admin"],
    ["mal formé", "Mon Studio"],
    ["trop court", "ab"],
    ["pris", "tatoueur-b"],
  ])("pseudo %s refusé avec un message, sans rien changer", async (_label, slug) => {
    signInAs(db, A);
    const { changeSlug } = await import("@/app/dashboard/settings/actions");
    const result = await changeSlug(slug);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toEqual(expect.any(String));
    expect((await db.query<{ slug: string }>(`select slug from public.artists where id = $1`, [A])).rows[0].slug).toBe("tatoueur-a");
  });
});
