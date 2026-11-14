import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  BETA_ARTIST_ID,
  addProject,
  applyMigrations,
  catalogSnapshot,
  asAnon,
  asService,
  asUser,
  createDb,
  readRollback,
  runAs,
  signup,
} from "./helpers/db";

/**
 * Migration 0020 (salons) sur un vrai PostgreSQL en mémoire.
 * Priorité : un salon ne doit JAMAIS ouvrir l'accès aux données d'un autre
 * tatoueur (demandes, devis, paiements).
 */

async function freshDb(upTo?: string): Promise<PGlite> {
  const db = await createDb();
  await applyMigrations(db, { upTo: "0003" });
  await db.query(`insert into auth.users (id, email) values ($1, 'beta@example.test')`, [BETA_ARTIST_ID]);
  await db.query(
    `insert into public.artists (id, display_name, instagram_handle) values ($1, 'TattFlow', 'tattflow')`,
    [BETA_ARTIST_ID]
  );
  await applyMigrations(db, { from: "0004", upTo });
  return db;
}

let db: PGlite;
let alice: string; // propriétaire du salon
let bob: string; // membre
let carol: string; // sans salon
let dave: string; // propriétaire d'un autre salon
let salonId: string;
let otherSalonId: string;

async function expectFail(promise: Promise<unknown>, pattern: RegExp) {
  await expect(promise).rejects.toThrow(pattern);
}

beforeAll(async () => {
  db = await freshDb();
  alice = await signup(db, { slug: "alice-ink", displayName: "Alice" });
  bob = await signup(db, { slug: "bob-ink", displayName: "Bob" });
  carol = await signup(db, { slug: "carol-ink", displayName: "Carol" });
  dave = await signup(db, { slug: "dave-ink", displayName: "Dave" });

  const created = await runAs<{ id: string }>(
    db,
    asUser(alice),
    `insert into public.salons (owner_id, slug, name, city) values ($1, 'studio-noir', 'Studio Noir', 'Lyon') returning id`,
    [alice]
  );
  salonId = created[0].id;
  const created2 = await runAs<{ id: string }>(
    db,
    asUser(dave),
    `insert into public.salons (owner_id, slug, name) values ($1, 'atelier-rouge', 'Atelier Rouge') returning id`,
    [dave]
  );
  otherSalonId = created2[0].id;

  // Une demande privée par tatoueur, pour prouver que le salon n'ouvre rien.
  for (const artist of [alice, bob, dave]) await addProject(db, artist);
  const seeded = await db.query<{ n: number }>(`select count(*)::int as n from public.projects`);
  expect(seeded.rows[0].n).toBe(3);
});

afterAll(async () => {
  await db.close();
});

describe("création du salon", () => {
  it("le créateur devient membre de son salon automatiquement", async () => {
    const rows = await runAs(db, asUser(alice), `select artist_id from public.salon_members where salon_id = $1`, [salonId]);
    expect(rows).toEqual([{ artist_id: alice }]);
  });

  it("on ne peut pas créer un salon au nom d'un autre tatoueur", async () => {
    await expectFail(
      runAs(db, asUser(carol), `insert into public.salons (owner_id, slug, name) values ($1, 'faux-salon', 'Faux')`, [alice]),
      /row-level security|violates/i
    );
  });

  it("un tatoueur ne crée qu'un seul salon", async () => {
    await expectFail(
      runAs(db, asUser(alice), `insert into public.salons (owner_id, slug, name) values ($1, 'second-salon', 'Second')`, [alice]),
      /duplicate|unique/i
    );
  });

  it("un membre non propriétaire ne peut pas créer de second salon (déjà dans un salon)", async () => {
    const token = (await runAs<{ t: string }>(db, asService, `select public.create_salon_invite($1) as t`, [alice]))[0].t;
    await runAs(db, asService, `select public.accept_salon_invite($1, $2)`, [token, bob]);
    await expectFail(
      runAs(db, asUser(bob), `insert into public.salons (owner_id, slug, name) values ($1, 'salon-de-bob', 'Bob')`, [bob]),
      /duplicate|unique/i
    );
  });

  it("applique les règles de pseudo (réservé, format, doublon sans tenir compte de la casse)", async () => {
    const attempt = (slug: string) =>
      runAs(db, asUser(carol), `insert into public.salons (owner_id, slug, name) values ($1, $2, 'X')`, [carol, slug]);
    await expectFail(attempt("admin"), /slug_invalid:reserved/);
    await expectFail(attempt("ab"), /slug_invalid:too_short/);
    await expectFail(attempt("Salon Noir"), /slug_invalid:invalid_format/);
    await expectFail(attempt("STUDIO-NOIR"), /slug_invalid/);
    await expectFail(attempt("studio-noir"), /slug_invalid:taken|duplicate|unique/);
  });

  it("le nom ne peut pas être vide", async () => {
    await expectFail(
      runAs(db, asUser(carol), `insert into public.salons (owner_id, slug, name) values ($1, 'salon-vide', '   ')`, [carol]),
      /check|violates/i
    );
  });
});

describe("modification et suppression", () => {
  it("le propriétaire modifie nom, ville et présentation", async () => {
    const rows = await runAs(db, asUser(alice), `update public.salons set name = 'Studio Noir Lyon', bio = 'Bienvenue' where id = $1 returning name`, [salonId]);
    expect(rows).toEqual([{ name: "Studio Noir Lyon" }]);
  });

  it("le propriétaire ne peut pas changer le pseudo ni passer le salon à un autre", async () => {
    await expectFail(runAs(db, asUser(alice), `update public.salons set slug = 'autre-nom' where id = $1`, [salonId]), /permission denied/i);
    await expectFail(runAs(db, asUser(alice), `update public.salons set owner_id = $2 where id = $1`, [salonId, bob]), /permission denied/i);
  });

  it("un membre simple ne modifie pas le salon", async () => {
    const rows = await runAs(db, asUser(bob), `update public.salons set name = 'Piraté' where id = $1 returning id`, [salonId]);
    expect(rows).toEqual([]);
  });

  it("le propriétaire d'un autre salon ne modifie ni ne supprime ce salon", async () => {
    expect(await runAs(db, asUser(dave), `update public.salons set name = 'Piraté' where id = $1 returning id`, [salonId])).toEqual([]);
    expect(await runAs(db, asUser(dave), `delete from public.salons where id = $1 returning id`, [salonId])).toEqual([]);
  });
});

describe("isolation : lecture", () => {
  it("les visiteurs ne lisent rien", async () => {
    for (const table of ["salons", "salon_members", "salon_invites"]) {
      await expectFail(runAs(db, asAnon, `select * from public.${table}`), /permission denied/i);
    }
  });

  it("un tatoueur sans salon ne voit aucun salon", async () => {
    expect(await runAs(db, asUser(carol), `select id from public.salons`)).toEqual([]);
    expect(await runAs(db, asUser(carol), `select * from public.salon_members`)).toEqual([]);
  });

  it("chaque salon ne voit que ses propres membres", async () => {
    const aliceView = await runAs<{ artist_id: string }>(db, asUser(alice), `select artist_id from public.salon_members`);
    expect(aliceView.map((r) => r.artist_id).sort()).toEqual([alice, bob].sort());
    const daveView = await runAs<{ artist_id: string }>(db, asUser(dave), `select artist_id from public.salon_members`);
    expect(daveView.map((r) => r.artist_id)).toEqual([dave]);
    expect(await runAs(db, asUser(dave), `select id from public.salons where id = $1`, [salonId])).toEqual([]);
  });

  it("personne ne lit la table des invitations", async () => {
    await expectFail(runAs(db, asUser(alice), `select token from public.salon_invites`), /permission denied/i);
  });

  it("être dans le même salon n'ouvre PAS les demandes, devis ni paiements des collègues", async () => {
    // alice (propriétaire) et bob (membre) sont dans le même salon.
    const aliceProjects = await runAs<{ artist_id: string }>(db, asUser(alice), `select artist_id from public.projects`);
    expect(aliceProjects.every((p) => p.artist_id === alice)).toBe(true);
    const bobProjects = await runAs<{ artist_id: string }>(db, asUser(bob), `select artist_id from public.projects`);
    expect(bobProjects.every((p) => p.artist_id === bob)).toBe(true);
    // Et pas de modification d'une demande d'un collègue.
    const touched = await runAs(db, asUser(alice), `update public.projects set status = 'declined' where artist_id = $1 returning id`, [bob]);
    expect(touched).toEqual([]);
  });
});

describe("membres : retrait et départ", () => {
  it("le propriétaire retire un membre", async () => {
    const t = (await runAs<{ t: string }>(db, asService, `select public.create_salon_invite($1) as t`, [alice]))[0].t;
    await runAs(db, asService, `select public.accept_salon_invite($1, $2)`, [t, carol]);
    const rows = await runAs(db, asUser(alice), `delete from public.salon_members where salon_id = $1 and artist_id = $2 returning artist_id`, [salonId, carol]);
    expect(rows).toEqual([{ artist_id: carol }]);
  });

  it("un membre ne retire pas un collègue", async () => {
    const t = (await runAs<{ t: string }>(db, asService, `select public.create_salon_invite($1) as t`, [alice]))[0].t;
    await runAs(db, asService, `select public.accept_salon_invite($1, $2)`, [t, carol]);
    expect(await runAs(db, asUser(bob), `delete from public.salon_members where artist_id = $1 returning artist_id`, [carol])).toEqual([]);
    // Carol quitte d'elle-même.
    expect(await runAs(db, asUser(carol), `delete from public.salon_members where artist_id = $1 returning artist_id`, [carol])).toEqual([{ artist_id: carol }]);
  });

  it("le propriétaire ne peut pas se retirer lui-même (il supprime le salon)", async () => {
    expect(await runAs(db, asUser(alice), `delete from public.salon_members where artist_id = $1 returning artist_id`, [alice])).toEqual([]);
  });

  it("le propriétaire d'un autre salon ne retire personne", async () => {
    expect(await runAs(db, asUser(dave), `delete from public.salon_members where artist_id = $1 returning artist_id`, [bob])).toEqual([]);
  });

  it("personne ne s'ajoute directement comme membre", async () => {
    await expectFail(
      runAs(db, asUser(carol), `insert into public.salon_members (salon_id, artist_id) values ($1, $2)`, [salonId, carol]),
      /permission denied/i
    );
  });
});

describe("invitations", () => {
  it("seul le serveur crée et utilise une invitation", async () => {
    await expectFail(runAs(db, asUser(alice), `select public.create_salon_invite($1)`, [alice]), /permission denied/i);
    await expectFail(runAs(db, asAnon, `select public.accept_salon_invite('x', $1)`, [carol]), /permission denied/i);
  });

  it("un tatoueur sans salon ne peut pas créer d'invitation", async () => {
    await expectFail(runAs(db, asService, `select public.create_salon_invite($1)`, [carol]), /not_salon_owner/);
  });

  it("une invitation ne sert qu'une fois", async () => {
    const t = (await runAs<{ t: string }>(db, asService, `select public.create_salon_invite($1) as t`, [alice]))[0].t;
    await runAs(db, asService, `select public.accept_salon_invite($1, $2)`, [t, carol]);
    await expectFail(runAs(db, asService, `select public.accept_salon_invite($1, $2)`, [t, dave]), /invite_invalid/);
    await runAs(db, asService, `delete from public.salon_members where artist_id = $1`, [carol]);
  });

  it("une invitation expirée ou inconnue est refusée", async () => {
    const t = (await runAs<{ t: string }>(db, asService, `select public.create_salon_invite($1) as t`, [alice]))[0].t;
    await db.query(`update public.salon_invites set expires_at = now() - interval '1 minute' where token = $1`, [t]);
    await expectFail(runAs(db, asService, `select public.accept_salon_invite($1, $2)`, [t, carol]), /invite_invalid/);
    await expectFail(runAs(db, asService, `select public.accept_salon_invite('inconnu', $1)`, [carol]), /invite_invalid/);
  });

  it("un tatoueur déjà dans un salon ne peut pas en rejoindre un autre (et l'invitation reste utilisable)", async () => {
    const t = (await runAs<{ t: string }>(db, asService, `select public.create_salon_invite($1) as t`, [dave]))[0].t;
    await expectFail(runAs(db, asService, `select public.accept_salon_invite($1, $2)`, [t, bob]), /already_in_salon/);
    const row = await db.query<{ used_at: string | null }>(`select used_at from public.salon_invites where token = $1`, [t]);
    expect(row.rows[0].used_at).toBeNull();
  });

  it("20 tatoueurs maximum par salon", async () => {
    // alice + bob = 2 ; on remplit jusqu'à 20.
    for (let i = 0; i < 18; i++) {
      const id = await signup(db, { slug: `membre-${i}-x` });
      const t = (await runAs<{ t: string }>(db, asService, `select public.create_salon_invite($1) as t`, [alice]))[0].t;
      await runAs(db, asService, `select public.accept_salon_invite($1, $2)`, [t, id]);
    }
    const extra = await signup(db, { slug: "membre-de-trop" });
    const t = (await runAs<{ t: string }>(db, asService, `select public.create_salon_invite($1) as t`, [alice]))[0].t;
    await expectFail(runAs(db, asService, `select public.accept_salon_invite($1, $2)`, [t, extra]), /salon_full/);
  });
});

describe("suppression d'un tatoueur ou d'un salon", () => {
  it("supprimer le salon retire les membres mais garde les tatoueurs et leurs demandes", async () => {
    const before = await db.query<{ n: number }>(`select count(*)::int as n from public.projects where artist_id = $1`, [bob]);
    await runAs(db, asUser(dave), `delete from public.salons where id = $1`, [otherSalonId]);
    expect((await db.query(`select 1 from public.artists where id = $1`, [dave])).rows).toHaveLength(1);
    const after = await db.query<{ n: number }>(`select count(*)::int as n from public.projects where artist_id = $1`, [bob]);
    expect(after.rows[0].n).toBe(before.rows[0].n);
    expect((await db.query(`select 1 from public.salon_members where salon_id = $1`, [otherSalonId])).rows).toHaveLength(0);
  });
});

describe("migration 0020 : retour arrière et rejeu", () => {
  it("le retour arrière retire les salons sans toucher aux tatoueurs, puis la migration se rejoue", async () => {
    const own = await freshDb();
    const reference = await freshDb("0019");
    const before = await catalogSnapshot(reference);
    await reference.close();
    const a = await signup(own, { slug: "alice-ink" });
    await runAs(own, asUser(a), `insert into public.salons (owner_id, slug, name) values ($1, 'studio-noir', 'S')`, [a]);

    expect((await own.query(`select public.is_reserved_slug('salon') as r`)).rows[0]).toEqual({ r: true });

    await own.exec(readRollback("0020_salons.down.sql"));

    expect((await own.query(`select public.is_reserved_slug('salon') as r`)).rows[0]).toEqual({ r: false });
    const afterRollback = await catalogSnapshot(own);
    expect([...afterRollback].sort()).toEqual([...before].sort());
    const tables = await own.query(`select table_name from information_schema.tables where table_schema = 'public' and table_name like 'salon%'`);
    expect(tables.rows).toEqual([]);
    expect((await own.query(`select 1 from public.artists where id = $1`, [a])).rows).toHaveLength(1);

    await applyMigrations(own, { from: "0020", upTo: "0020" });
    expect((await own.query(`select 1 from public.salons`)).rows).toHaveLength(0);
    await own.close();
  });
});
