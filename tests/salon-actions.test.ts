import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { addProject, applyMigrations, createDb, signup } from "./helpers/db";
import { signInAs, state as mockState } from "./helpers/mocks";

vi.mock("@/lib/supabase/server", async () => {
  const { state } = await import("./helpers/mocks");
  return { createClient: async () => state.server };
});
vi.mock("@/lib/supabase/admin", async () => {
  const { state } = await import("./helpers/mocks");
  return { createAdminClient: () => state.admin };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "localhost:3000" }),
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

/**
 * Actions du salon (création, invitation, retrait…) et pages publiques,
 * exécutées sur la vraie base en mémoire. Chaque scénario d'isolation est
 * joué AVEC les règles de la base (cas réel) et SANS (le code seul doit
 * déjà filtrer).
 */

describe.each([
  { label: "avec les règles de la base (RLS)", withRls: true },
  { label: "SANS les règles de la base : le code seul doit filtrer", withRls: false },
])("salons : actions et isolation — $label", ({ withRls }) => {
  let db: PGlite;
  let owner: string;
  let member: string;
  let outsider: string;
  let otherOwner: string;
  let otherMember: string;

  const as = (id: string | null) => signInAs(db, id, { withRls });
  const memberIds = async (slug: string) =>
    (
      await db.query<{ artist_id: string }>(
        `select m.artist_id from public.salon_members m join public.salons s on s.id = m.salon_id where s.slug = $1`,
        [slug]
      )
    ).rows
      .map((r) => r.artist_id)
      .sort();

  beforeAll(async () => {
    db = await createDb();
    await applyMigrations(db);
    owner = await signup(db, { slug: "sa-owner", displayName: "Owner" });
    member = await signup(db, { slug: "sa-member", displayName: "Member" });
    outsider = await signup(db, { slug: "sa-outsider", displayName: "Outsider" });
    otherOwner = await signup(db, { slug: "sa-other-owner", displayName: "Other Owner" });
    otherMember = await signup(db, { slug: "sa-other-member", displayName: "Other Member" });
    await db.query(`update public.artists set practiced_styles = array['Fineline'] where id = $1`, [member]);

    const actions = await import("@/app/dashboard/settings/salon-actions");

    as(owner);
    expect(await actions.createSalon({ name: "Studio Noir", slug: "studio-noir", city: "Lyon" })).toEqual({ ok: true });
    as(otherOwner);
    expect(await actions.createSalon({ name: "Atelier Rouge", slug: "atelier-rouge", city: "" })).toEqual({ ok: true });

    // Invitations (via le serveur) : member -> studio-noir, otherMember -> atelier-rouge.
    as(owner);
    const inviteA = await actions.createSalonInvite();
    expect(inviteA.ok).toBe(true);
    as(otherOwner);
    const inviteB = await actions.createSalonInvite();
    expect(inviteB.ok).toBe(true);
    const tokenOf = (r: { ok: boolean; url?: string }) => new URL(r.url!).searchParams.get("token")!;
    as(member);
    expect(await actions.acceptSalonInvite(tokenOf(inviteA as { ok: boolean; url?: string }))).toEqual({ ok: true });
    as(otherMember);
    expect(await actions.acceptSalonInvite(tokenOf(inviteB as { ok: boolean; url?: string }))).toEqual({ ok: true });

    for (const id of [owner, member, otherOwner, otherMember]) await addProject(db, id);
  });
  afterAll(() => db.close());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("le lien d'invitation pointe vers l'adresse publique d'invitation et ne fuit rien d'autre", async () => {
    const actions = await import("@/app/dashboard/settings/salon-actions");
    as(owner);
    const res = await actions.createSalonInvite();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.url).toMatch(/^http:\/\/localhost:3000\/invitation-salon\?token=[a-f0-9]{64}$/);
    }
  });

  it("refuse la création avec un pseudo invalide ou réservé, un nom vide, ou si on est déjà dans un salon", async () => {
    const actions = await import("@/app/dashboard/settings/salon-actions");
    as(outsider);
    for (const slug of ["admin", "ab", "Mon Salon", ""]) {
      const res = await actions.createSalon({ name: "Salon", slug, city: "" });
      expect(res.ok).toBe(false);
    }
    expect((await actions.createSalon({ name: "  ", slug: "salon-ok", city: "" })).ok).toBe(false);
    const taken = await actions.createSalon({ name: "Copie", slug: "STUDIO-NOIR".toLowerCase(), city: "" });
    expect(taken).toMatchObject({ ok: false });
    as(member);
    expect(await actions.createSalon({ name: "Mon propre salon", slug: "mon-salon", city: "" })).toEqual({
      ok: false,
      message: "Tu fais déjà partie d'un salon.",
    });
    expect((await db.query(`select 1 from public.salons`)).rows).toHaveLength(2);
  });

  it("seul le propriétaire modifie son salon", async () => {
    const actions = await import("@/app/dashboard/settings/salon-actions");
    as(member);
    expect((await actions.updateSalon({ name: "Piraté", city: "", bio: "" })).ok).toBe(false);
    as(outsider);
    expect((await actions.updateSalon({ name: "Piraté", city: "", bio: "" })).ok).toBe(false);
    as(otherOwner);
    expect((await actions.updateSalon({ name: "Atelier Rouge 2", city: "", bio: "Bienvenue" })).ok).toBe(true);
    const names = (await db.query<{ name: string }>(`select name from public.salons order by name`)).rows.map((r) => r.name);
    expect(names).toEqual(["Atelier Rouge 2", "Studio Noir"]);
  });

  it("le propriétaire d'un autre salon ne retire personne d'un salon qui n'est pas le sien", async () => {
    const actions = await import("@/app/dashboard/settings/salon-actions");
    as(otherOwner);
    expect((await actions.removeSalonMember(member)).ok).toBe(false);
    as(outsider);
    expect((await actions.removeSalonMember(member)).ok).toBe(false);
    as(member);
    expect((await actions.removeSalonMember(owner)).ok).toBe(false);
    expect(await memberIds("studio-noir")).toEqual([owner, member].sort());
  });

  it("le propriétaire ne quitte pas son salon, un tatoueur sans salon ne peut rien quitter", async () => {
    const actions = await import("@/app/dashboard/settings/salon-actions");
    as(owner);
    expect((await actions.leaveSalon()).ok).toBe(false);
    as(outsider);
    expect((await actions.leaveSalon()).ok).toBe(false);
    expect(await memberIds("studio-noir")).toEqual([owner, member].sort());
  });

  it("un tatoueur sans salon ne peut pas inviter, supprimer ni voir de salon", async () => {
    const actions = await import("@/app/dashboard/settings/salon-actions");
    const { getMySalon } = await import("@/lib/salon");
    as(outsider);
    expect((await actions.createSalonInvite()).ok).toBe(false);
    expect((await actions.deleteSalon()).ok).toBe(false);
    expect(await getMySalon(state(), outsider)).toBeNull();
    as(member);
    expect((await actions.createSalonInvite()).ok).toBe(false);
    expect((await actions.deleteSalon()).ok).toBe(false);
  });

  it("chaque membre ne voit que son propre salon et ses propres collègues", async () => {
    const { getMySalon } = await import("@/lib/salon");
    as(member);
    const mine = await getMySalon(state(), member);
    expect(mine?.name).toBe("Studio Noir");
    expect(mine?.isOwner).toBe(false);
    expect(mine?.members.map((m) => m.id).sort()).toEqual([owner, member].sort());
    as(otherMember);
    const theirs = await getMySalon(state(), otherMember);
    expect(theirs?.members.map((m) => m.id).sort()).toEqual([otherOwner, otherMember].sort());
  });

  it("les invitations sont à usage unique et ne marchent pas pour quelqu'un déjà dans un salon", async () => {
    const actions = await import("@/app/dashboard/settings/salon-actions");
    as(owner);
    const invite = await actions.createSalonInvite();
    if (!invite.ok) throw new Error("invitation attendue");
    const token = new URL(invite.url).searchParams.get("token")!;
    as(otherMember);
    expect((await actions.acceptSalonInvite(token)).ok).toBe(false); // déjà dans un autre salon
    as(outsider);
    expect(await actions.acceptSalonInvite("pas-un-jeton")).toMatchObject({ ok: false });
    expect(await actions.acceptSalonInvite(token)).toEqual({ ok: true });
    const again = await actions.acceptSalonInvite(token);
    expect(again.ok).toBe(false);
    // Remise en état pour les tests suivants.
    as(owner);
    expect((await actions.removeSalonMember(outsider)).ok).toBe(true);
  });

  it("la page publique du salon n'expose que des infos publiques des tatoueurs", async () => {
    const { fetchPublicSalon } = await import("@/lib/salon");
    as(null);
    const salon = await fetchPublicSalon("studio-noir");
    expect(salon?.members.map((m) => m.slug).sort()).toEqual(["sa-member", "sa-owner"]);
    const json = JSON.stringify(salon);
    expect(json).not.toMatch(/stripe|email|payment|subscription|phone|client/i);
    expect(await fetchPublicSalon("inexistant")).toBeNull();
  });

  it("quitter puis supprimer : les demandes des tatoueurs restent intactes", async () => {
    const actions = await import("@/app/dashboard/settings/salon-actions");
    const projectsBefore = (await db.query<{ n: number }>(`select count(*)::int as n from public.projects`)).rows[0].n;
    as(member);
    expect(await actions.leaveSalon()).toEqual({ ok: true });
    expect(await memberIds("studio-noir")).toEqual([owner]);
    as(owner);
    expect(await actions.deleteSalon()).toEqual({ ok: true });
    expect((await db.query(`select 1 from public.salons where slug = 'studio-noir'`)).rows).toHaveLength(0);
    expect((await db.query<{ n: number }>(`select count(*)::int as n from public.projects`)).rows[0].n).toBe(projectsBefore);
    expect((await db.query(`select 1 from public.artists`)).rows).toHaveLength(5);
  });
});

function state() {
  // Le client "tatoueur" courant, tel que le code serveur le reçoit.
  return mockState.server as never;
}
