import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { applyMigrations, createDb, signup } from "./helpers/db";
import { signInAs, state as mockState } from "./helpers/mocks";

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

/**
 * Zone du corps, style, style d'écriture et photo de profil, sur la vraie
 * base en mémoire.
 */

let db: PGlite;
let A: string;
let B: string;

const aTuesday = (() => {
  let d = new Date("2099-01-05T00:00:00");
  while (d.getDay() !== 2) d = new Date(d.getTime() + 24 * 3600 * 1000);
  return d.toISOString().split("T")[0];
})();

function requestForm(extra: Record<string, string> = {}) {
  const form = new FormData();
  const fields: Record<string, string> = {
    firstName: "Detail",
    lastName: "Client",
    email: "detail@client.test",
    phone: "0600000000",
    description: "Une description assez longue",
    bodyLocation: "Poignet",
    sizeCategory: "Petit (< 5 cm)",
    style: "Fineline",
    colorMode: "Couleur",
    preferredDate: aTuesday,
    preferredTime: "10:00",
    website: "",
    artistSlug: "detail-a",
    ...extra,
  };
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return new Request("http://localhost/api/requests", { method: "POST", body: form });
}

const stored = async () =>
  (
    await db.query<{ artist_id: string; body_location: string; style: string }>(
      `select artist_id, body_location, style from public.projects where first_name = 'Detail' order by created_at`
    )
  ).rows;
const clear = () => db.query(`delete from public.projects where first_name in ('Detail', 'Manuel')`);

beforeAll(async () => {
  db = await createDb();
  await applyMigrations(db);
  A = await signup(db, { slug: "detail-a", displayName: "Studio A" });
  B = await signup(db, { slug: "detail-b", displayName: "Studio B" });
  await db.query(`update public.artists set stripe_account_id = 'acct_test', stripe_charges_enabled = true`);
});
afterAll(() => db.close());

beforeEach(async () => {
  signInAs(db, null);
  vi.clearAllMocks();
  await clear();
});

describe("demande du client : zone, style et style d'écriture", () => {
  const send = async (extra: Record<string, string> = {}) => {
    const route = await import("@/app/api/requests/route");
    return route.POST(requestForm(extra));
  };

  it("une demande sans aucun nouveau champ fonctionne comme avant", async () => {
    expect((await send()).status).toBe(201);
    expect(await stored()).toEqual([{ artist_id: A, body_location: "Poignet", style: "Fineline" }]);
  });

  it("la précision sur l'emplacement est ajoutée à la zone", async () => {
    expect((await send({ bodyLocationDetail: "  côté gauche,\n face intérieure " })).status).toBe(201);
    expect((await stored())[0].body_location).toBe("Poignet — côté gauche, face intérieure");
  });

  it("zone « Autre » : refusée sans précision, enregistrée avec", async () => {
    const refused = await send({ bodyLocation: "Autre" });
    expect(refused.status).toBe(400);
    expect((await refused.json()).error.bodyLocationDetail?.[0]).toMatch(/précise/i);
    expect(await stored()).toHaveLength(0);

    expect((await send({ bodyLocation: "Autre", bodyLocationDetail: "derrière le genou" })).status).toBe(201);
    expect((await stored())[0].body_location).toBe("Autre — derrière le genou");
  });

  it("style « Autre » : refusé sans précision, enregistré avec", async () => {
    expect((await send({ style: "Autre" })).status).toBe(400);
    expect(await stored()).toHaveLength(0);

    expect((await send({ style: "Autre", styleDetail: "gravure et aquarelle" })).status).toBe(201);
    expect((await stored())[0].style).toBe("Autre — gravure et aquarelle");
  });

  it("lettrage : refusé sans style d'écriture, enregistré avec", async () => {
    const refused = await send({ style: "Lettrage / Écriture" });
    expect(refused.status).toBe(400);
    expect((await refused.json()).error.letteringStyle?.[0]).toMatch(/écriture/i);
    expect(await stored()).toHaveLength(0);

    expect((await send({ style: "Lettrage / Écriture", letteringStyle: "Gothique (Old English)" })).status).toBe(201);
    expect((await stored())[0].style).toBe("Lettrage / Écriture — Gothique (Old English)");
  });

  it("lettrage « Autre » : la description de l'écriture est enregistrée", async () => {
    expect((await send({ style: "Lettrage / Écriture", letteringStyle: "Autre" })).status).toBe(400);
    expect(
      (await send({ style: "Lettrage / Écriture", letteringStyle: "Autre", styleDetail: "comme ma grand-mère" })).status
    ).toBe(201);
    expect((await stored())[0].style).toBe("Lettrage / Écriture — comme ma grand-mère");
  });

  it("un reste de saisie sur un style de la liste est ignoré", async () => {
    expect((await send({ style: "Japonais", styleDetail: "ancien texte", letteringStyle: "Graffiti / Tag" })).status).toBe(201);
    expect((await stored())[0].style).toBe("Japonais");
  });

  it("zone ou style hors catalogue : refusé, rien n'est enregistré", async () => {
    expect((await send({ bodyLocation: "<img src=x onerror=alert(1)>" })).status).toBe(400);
    expect((await send({ style: "'; drop table projects; --" })).status).toBe(400);
    expect((await send({ bodyLocation: "" })).status).toBe(400);
    expect(await stored()).toHaveLength(0);
  });

  it("du code dans une précision est enregistré comme simple texte, pour le bon tatoueur", async () => {
    const res = await send({ bodyLocation: "Autre", bodyLocationDetail: "<script>alert(1)</script>" });
    expect(res.status).toBe(201);
    expect(await stored()).toEqual([
      { artist_id: A, body_location: "Autre — <script>alert(1)</script>", style: "Fineline" },
    ]);
  });
});

describe("projet saisi à la main par le tatoueur", () => {
  const body = (extra: Record<string, unknown> = {}) => ({
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
    ...extra,
  });
  const send = async (extra: Record<string, unknown> = {}) => {
    const route = await import("@/app/api/projects/manual/route");
    return route.POST(
      new Request("http://localhost/api/projects/manual", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body(extra)),
      })
    );
  };
  const manualRows = async () =>
    (
      await db.query<{ artist_id: string; body_location: string; style: string }>(
        `select artist_id, body_location, style from public.projects where first_name = 'Manuel'`
      )
    ).rows;

  it("les anciennes valeurs passent toujours", async () => {
    signInAs(db, A);
    expect((await send()).status).toBe(200);
    expect(await manualRows()).toEqual([{ artist_id: A, body_location: "Bras", style: "Minimaliste" }]);
  });

  it("mêmes règles que pour le client : « Autre » et lettrage doivent être précisés", async () => {
    signInAs(db, A);
    expect((await send({ bodyLocation: "Autre" })).status).toBe(400);
    expect((await send({ style: "Lettrage / Écriture" })).status).toBe(400);
    expect(await manualRows()).toHaveLength(0);

    expect(
      (
        await send({
          bodyLocation: "Autre",
          bodyLocationDetail: "derrière le genou",
          style: "Lettrage / Écriture",
          letteringStyle: "Chiffres romains",
        })
      ).status
    ).toBe(200);
    expect(await manualRows()).toEqual([
      {
        artist_id: A,
        body_location: "Autre — derrière le genou",
        style: "Lettrage / Écriture — Chiffres romains",
      },
    ]);
  });
});

describe("styles pratiqués par le tatoueur", () => {
  it("seuls des styles du catalogue sont enregistrés, et seulement pour soi", async () => {
    signInAs(db, A);
    const { updatePracticedStyles } = await import("@/app/dashboard/settings/actions");
    await updatePracticedStyles(["Dotwork", "<script>", "Dotwork", "Autre", "Japonais"]);

    const rows = await db.query<{ id: string; practiced_styles: string[] }>(
      `select id, practiced_styles from public.artists where id in ($1, $2)`,
      [A, B]
    );
    const byId = Object.fromEntries(rows.rows.map((r) => [r.id, r.practiced_styles]));
    expect(byId[A]).toEqual(["Dotwork", "Japonais"]);
    expect(byId[B]).toEqual([]);
  });
});

describe.each([
  { label: "avec les règles de la base (RLS)", withRls: true },
  { label: "SANS les règles de la base : le code seul doit filtrer", withRls: false },
])("photo de profil — $label", ({ withRls }) => {
  const BASE = "https://projet.supabase.co/storage/v1/object/public";
  let uploads: { bucket: string; path: string; type: string; size: number }[];
  let removed: { bucket: string; paths: string[] }[];
  let failWith: string | null;

  const signIn = (id: string) => {
    signInAs(db, id, { withRls });
    uploads = [];
    removed = [];
    failWith = null;
    // Faux stockage : on note ce que le code y envoie et y supprime.
    (mockState.server as unknown as { storage: unknown }).storage = {
      from: (bucket: string) => ({
        upload: async (path: string, file: File) => {
          if (failWith) return { error: { message: failWith } };
          uploads.push({ bucket, path, type: file.type, size: file.size });
          return { error: null };
        },
        remove: async (paths: string[]) => {
          removed.push({ bucket, paths });
          return { data: [], error: null };
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `${BASE}/${bucket}/${path}` } }),
      }),
    };
  };

  const photo = (type = "image/jpeg", size = 50_000) => {
    const form = new FormData();
    form.append("avatar", new File([new Uint8Array(size)], "moi.jpg", { type }));
    return form;
  };
  const avatarOf = async (id: string) =>
    (await db.query<{ avatar_url: string | null }>(`select avatar_url from public.artists where id = $1`, [id])).rows[0]
      .avatar_url;

  beforeEach(async () => {
    await db.query(`update public.artists set avatar_url = null`);
  });

  it("une photo valide est rangée dans le dossier du tatoueur et enregistrée sur SON profil uniquement", async () => {
    await db.query(`update public.artists set avatar_url = $1 where id = $2`, [`${BASE}/avatars/${B}/avatar-1.jpg`, B]);
    signIn(A);
    const { uploadAvatar } = await import("@/app/dashboard/settings/actions");
    const result = await uploadAvatar(photo());

    expect(result.ok).toBe(true);
    expect(uploads).toHaveLength(1);
    expect(uploads[0].bucket).toBe("avatars");
    expect(uploads[0].path).toMatch(new RegExp(`^${A}/avatar-\\d+\\.jpg$`));
    expect(await avatarOf(A)).toBe(`${BASE}/avatars/${uploads[0].path}`);
    expect(await avatarOf(B)).toBe(`${BASE}/avatars/${B}/avatar-1.jpg`);
  });

  it("l'ancienne photo est supprimée seulement si elle est dans le dossier du tatoueur", async () => {
    const { uploadAvatar } = await import("@/app/dashboard/settings/actions");

    await db.query(`update public.artists set avatar_url = $1 where id = $2`, [`${BASE}/avatars/${A}/avatar-1.jpg`, A]);
    signIn(A);
    expect((await uploadAvatar(photo())).ok).toBe(true);
    expect(removed).toEqual([{ bucket: "avatars", paths: [`${A}/avatar-1.jpg`] }]);

    // Adresse pointant vers le dossier d'un AUTRE tatoueur, ou vers un autre site.
    for (const foreign of [
      `${BASE}/avatars/${B}/avatar-1.jpg`,
      `${BASE}/avatars/${A}/../${B}/avatar-1.jpg`,
      "https://evil.example/pixel.gif",
    ]) {
      await db.query(`update public.artists set avatar_url = $1 where id = $2`, [foreign, A]);
      signIn(A);
      expect((await uploadAvatar(photo())).ok).toBe(true);
      expect(removed, foreign).toEqual([]);
    }
  });

  it("un fichier qui n'est pas une image, vide ou trop lourd est refusé sans rien envoyer", async () => {
    signIn(A);
    const { uploadAvatar } = await import("@/app/dashboard/settings/actions");

    for (const form of [photo("text/html"), photo("image/svg+xml"), photo("image/jpeg", 0), photo("image/jpeg", 1_000_001)]) {
      const result = await uploadAvatar(form);
      expect(result.ok).toBe(false);
    }
    expect((await uploadAvatar(new FormData())).ok).toBe(false);
    expect(uploads).toEqual([]);
    expect(await avatarOf(A)).toBeNull();
  });

  it("si le stockage refuse l'envoi, le message le dit et le profil ne change pas", async () => {
    signIn(A);
    failWith = "new row violates row-level security policy";
    const { uploadAvatar } = await import("@/app/dashboard/settings/actions");
    const result = await uploadAvatar(photo());

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/stockage des photos refuse/i) });
    expect(await avatarOf(A)).toBeNull();
  });

  it("retirer sa photo ne touche pas celle d'un autre tatoueur", async () => {
    await db.query(`update public.artists set avatar_url = $1 where id = $2`, [`${BASE}/avatars/${A}/avatar-1.jpg`, A]);
    await db.query(`update public.artists set avatar_url = $1 where id = $2`, [`${BASE}/avatars/${B}/avatar-1.jpg`, B]);
    signIn(A);
    const { resetAvatar } = await import("@/app/dashboard/settings/actions");
    await resetAvatar();

    expect(await avatarOf(A)).toBeNull();
    expect(await avatarOf(B)).toBe(`${BASE}/avatars/${B}/avatar-1.jpg`);
    expect(removed).toEqual([{ bucket: "avatars", paths: [`${A}/avatar-1.jpg`] }]);
  });
});
