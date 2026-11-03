import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  BETA_ARTIST_ID,
  addProject,
  applyMigrations,
  asService,
  asUser,
  catalogSnapshot,
  createDb,
  readMigration,
  readRollback,
  runAs,
  signup,
} from "./helpers/db";

const UP = "0018_multi_tenant_slugs.sql";
const DOWN = "0018_multi_tenant_slugs.down.sql";

/**
 * Reproduit l'histoire de la vraie base : le compte de la beta existe avant la
 * migration 0004 (qui lui donne le pseudo "tattflow"), puis d'autres tatoueurs
 * s'inscrivent à l'époque où la base ne vérifiait AUCUNE règle de pseudo, d'où
 * des pseudos anciens non conformes.
 */
describe("migration 0018 sur une copie de la base de la beta", () => {
  let db: PGlite;
  let studioNoir: string;
  let legacyUpper: string;
  let legacyShort: string;
  let legacyLong: string;
  let legacyReserved: string;
  let legacySpace: string;

  const dump = async () => ({
    artists: (await db.query(`select * from public.artists order by id`)).rows,
    projects: (await db.query(`select * from public.projects order by id`)).rows,
    blocked: (await db.query(`select * from public.blocked_dates order by id`)).rows,
  });

  const functionBody = async (name: string) =>
    (
      await db.query<{ md5: string }>(
        `select md5(prosrc) from pg_proc where proname = $1 and pronamespace = 'public'::regnamespace`,
        [name]
      )
    ).rows[0]?.md5;

  const projectsPolicy = async () =>
    (
      await db.query(
        `select cmd, qual, with_check from pg_policies
         where schemaname = 'public' and tablename = 'projects' and policyname = 'Artists can update own projects'`
      )
    ).rows[0];

  let catalogBefore: string[];
  let signupBodyBefore: string;
  let policyBefore: unknown;
  let dataBefore: Awaited<ReturnType<typeof dump>>;

  beforeAll(async () => {
    db = await createDb();
    await applyMigrations(db, { upTo: "0003" });
    await db.query(`insert into auth.users (id, email) values ($1, 'beta@example.test')`, [BETA_ARTIST_ID]);
    await db.query(
      `insert into public.artists (id, display_name, instagram_handle) values ($1, 'TattFlow', 'tattflow')`,
      [BETA_ARTIST_ID]
    );
    await applyMigrations(db, { from: "0004", upTo: "0017" });

    await addProject(db, BETA_ARTIST_ID, { status: "pending", first_name: "Alice" });
    await addProject(db, BETA_ARTIST_ID, { status: "quoted", quoted_price_cents: 20000 });
    await addProject(db, BETA_ARTIST_ID, {
      status: "deposit_paid",
      deposit_amount_cents: 6000,
      scheduled_start_time: "10:00",
      duration_hours: 2,
    });
    await db.query(
      `insert into public.blocked_dates (artist_id, blocked_date) values ($1, '2099-02-01')`,
      [BETA_ARTIST_ID]
    );

    studioNoir = await signup(db, { slug: "studio-noir", displayName: "Studio Noir" });
    legacyUpper = await signup(db, { slug: "TatouageParis", displayName: "Paris" });
    legacyShort = await signup(db, { slug: "ab", displayName: "Court" });
    legacyLong = await signup(db, { slug: "x".repeat(40), displayName: "Long" });
    legacyReserved = await signup(db, { slug: "api", displayName: "Reserve" });
    legacySpace = await signup(db, { slug: "mon studio", displayName: "Espace" });
    await addProject(db, studioNoir, { first_name: "Bob" });

    catalogBefore = await catalogSnapshot(db);
    signupBodyBefore = (await functionBody("handle_new_artist"))!;
    policyBefore = await projectsPolicy();
    dataBefore = await dump();
  });
  afterAll(() => db.close());

  it("la copie de départ ressemble à la vraie base (tattflow + pseudos anciens non conformes)", async () => {
    const rows = await db.query<{ slug: string }>(`select slug from public.artists order by slug`);
    expect(rows.rows.map((r) => r.slug)).toEqual(
      expect.arrayContaining(["tattflow", "studio-noir", "TatouageParis", "ab", "api", "mon studio", "x".repeat(40)])
    );
  });

  it("la migration 0018 s'applique sans erreur et ne modifie aucune donnée existante", async () => {
    await db.exec(readMigration(UP));
    expect(await dump()).toEqual(dataBefore);
  });

  it("le tenant « tattflow » est intact : /book/tattflow retrouve le même tatoueur et ses données", async () => {
    const found = await runAs<{ id: string }>(
      db, asService, `select id from public.artists where slug = 'tattflow'`
    );
    expect(found).toEqual([{ id: BETA_ARTIST_ID }]);

    const mine = await runAs(db, asUser(BETA_ARTIST_ID), `select id from public.projects`);
    expect(mine).toHaveLength(3);
    const hisBlocked = await runAs(db, asUser(BETA_ARTIST_ID), `select 1 from public.blocked_dates`);
    expect(hisBlocked).toHaveLength(1);
  });

  it("les pseudos anciens non conformes restent en place et leurs comptes continuent de fonctionner", async () => {
    const slugs = (
      await db.query<{ slug: string }>(`select slug from public.artists where id = any($1::uuid[])`, [
        [legacyUpper, legacyShort, legacyLong, legacyReserved, legacySpace],
      ])
    ).rows.map((r) => r.slug);
    expect(slugs.sort()).toEqual(["TatouageParis", "ab", "api", "mon studio", "x".repeat(40)].sort());

    for (const id of [legacyUpper, legacyShort, legacyLong, legacyReserved, legacySpace]) {
      await runAs(db, asUser(id), `update public.artists set bio = 'toujours là' where id = $1`, [id]);
      const rows = await db.query<{ bio: string }>(`select bio from public.artists where id = $1`, [id]);
      expect(rows.rows[0].bio).toBe("toujours là");
    }
  });

  it("personne d'autre ne peut prendre « tattflow » (réservé) ni un nouveau pseudo identique à un ancien à la casse près", async () => {
    await expect(signup(db, { slug: "tattflow" })).rejects.toThrow(/slug_invalid:reserved/);
    await expect(signup(db, { slug: "tatouageparis" })).rejects.toThrow(/duplicate key|unique/i);
  });

  it("de nouvelles inscriptions valides fonctionnent toujours", async () => {
    const id = await signup(db, { slug: "nouveau-tatoueur", displayName: "Nouveau" });
    const rows = await db.query<{ slug: string }>(`select slug from public.artists where id = $1`, [id]);
    expect(rows.rows[0].slug).toBe("nouveau-tatoueur");
  });

  it("le tenant « tattflow » peut changer de pseudo puis retrouver « tattflow » dans les 90 jours", async () => {
    const change = (slug: string) =>
      runAs(db, asService, `select public.change_artist_slug($1, $2)`, [BETA_ARTIST_ID, slug]);

    await change("tattflow-studio");
    const held = await db.query(
      `select 1 from public.artist_slug_history where old_slug = 'tattflow' and artist_id = $1`,
      [BETA_ARTIST_ID]
    );
    expect(held.rows).toHaveLength(1);
    // Pendant ce temps personne d'autre ne peut le prendre.
    await expect(signup(db, { slug: "tattflow" })).rejects.toThrow();

    await change("tattflow");
    const slug = await db.query<{ slug: string }>(`select slug from public.artists where id = $1`, [BETA_ARTIST_ID]);
    expect(slug.rows[0].slug).toBe("tattflow");
  });

  it("une fois les 90 jours passés, « tattflow » redevient réservé et ne peut plus être repris", async () => {
    await runAs(db, asService, `select public.change_artist_slug($1, 'tattflow-studio')`, [BETA_ARTIST_ID]);
    await db.query(`update public.artist_slug_history set expires_at = now() - interval '1 day' where old_slug = 'tattflow'`);
    await expect(
      runAs(db, asService, `select public.change_artist_slug($1, 'tattflow')`, [BETA_ARTIST_ID])
    ).rejects.toThrow(/slug_invalid:reserved/);
    // Remet le tenant de la beta dans son état d'origine pour la suite (la
    // règle est suspendue seulement ici : sinon même cette écriture directe
    // serait refusée, ce que le test précédent vient justement de prouver).
    await db.exec(`alter table public.artists disable trigger artists_enforce_slug`);
    await db.query(`update public.artists set slug = 'tattflow' where id = $1`, [BETA_ARTIST_ID]);
    await db.exec(`alter table public.artists enable trigger artists_enforce_slug`);
  });

  it("retour arrière : la base revient exactement à l'état d'avant 0018", async () => {
    const dataBeforeRollback = await dump();
    await db.exec(readRollback(DOWN));

    expect(await catalogSnapshot(db)).toEqual(catalogBefore);
    expect(await functionBody("handle_new_artist")).toBe(signupBodyBefore);
    expect(await projectsPolicy()).toEqual(policyBefore);
    expect(await dump()).toEqual(dataBeforeRollback);
  });

  it("après le retour arrière, la sécurité de la migration 0017 est toujours en place", async () => {
    await expect(
      runAs(db, asUser(studioNoir), `update public.artists set subscription_status = 'active' where id = $1`, [studioNoir])
    ).rejects.toThrow(/permission denied/i);
  });

  it("la migration est rejouable après un retour arrière", async () => {
    await db.exec(readMigration(UP));
    const rows = await runAs<{ code: string | null }>(db, asService, `select public.validate_slug('admin') as code`);
    expect(rows[0].code).toBe("reserved");
    await expect(signup(db, { slug: "tattflow" })).rejects.toThrow(/slug_invalid:reserved/);
  });

  it("la migration refuse de s'appliquer, avec un message clair, si deux pseudos ne diffèrent que par la casse", async () => {
    const fresh = await createDb();
    try {
      await applyMigrations(fresh, { upTo: "0017" });
      await signup(fresh, { slug: "doublon" });
      await signup(fresh, { slug: "DOUBLON" });
      await expect(fresh.exec(readMigration(UP))).rejects.toThrow(/ne different que par la casse/);
    } finally {
      await fresh.close();
    }
  });
});
