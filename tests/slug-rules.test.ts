import { readdirSync } from "node:fs";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  RESERVED_SLUGS,
  SLUG_MAX_LENGTH,
  normalizeSlugInput,
  slugSuggestionCandidates,
  slugify,
  validateSlug,
} from "@/lib/slug";
import {
  applyMigrations,
  asAnon,
  asService,
  asUser,
  createDb,
  readMigration,
  runAs,
  signup,
} from "./helpers/db";

const REQUIRED_RESERVED = [
  "admin", "api", "app", "dashboard", "login", "signup", "book", "pricing",
  "legal", "cgu", "help", "support", "www", "tattflow",
];

describe("règles de pseudo côté application", () => {
  it.each([
    ["mon-studio", null],
    ["abc", null],
    ["a1b2c3", null],
    ["x".repeat(30), null],
    ["ab", "too_short"],
    ["", "too_short"],
    ["x".repeat(31), "too_long"],
    ["Mon-Studio", "invalid_format"],
    ["mon studio", "invalid_format"],
    ["mon_studio", "invalid_format"],
    ["-studio", "invalid_format"],
    ["studio-", "invalid_format"],
    ["mon--studio", "invalid_format"],
    ["étoile", "invalid_format"],
    ["studio/../admin", "invalid_format"],
    ["admin", "reserved"],
    ["tattflow", "reserved"],
    ["api", "reserved"],
  ])("validateSlug(%j) -> %j", (slug, expected) => {
    expect(validateSlug(slug)).toBe(expected);
  });

  it("slugify : sans accents, sans espaces, 30 caractères maximum, jamais de tiret à la fin", () => {
    expect(slugify("Étoile Noire Tattoo")).toBe("etoile-noire-tattoo");
    expect(slugify("  Mon   Studio !! ")).toBe("mon-studio");
    expect(slugify("")).toBe("");
    const long = slugify("un nom de studio vraiment très très très long pour tester");
    expect(long.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(long.endsWith("-")).toBe(false);
  });

  it("normalizeSlugInput garde le tiret final pendant la frappe", () => {
    expect(normalizeSlugInput("Mon Studio-")).toBe("mon-studio-");
    expect(normalizeSlugInput("-abc")).toBe("abc");
    expect(normalizeSlugInput("a--b")).toBe("a-b");
    expect(normalizeSlugInput("x".repeat(50)).length).toBe(SLUG_MAX_LENGTH);
  });

  it.each(["admin", "tattflow", "mon-studio", "ab", "x".repeat(40), "Étoile Noire"])(
    "les suggestions pour %j sont toutes valides",
    (base) => {
      const suggestions = slugSuggestionCandidates(base);
      expect(suggestions.length).toBeGreaterThan(0);
      for (const suggestion of suggestions) {
        expect(validateSlug(suggestion)).toBeNull();
        expect(suggestion.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
      }
    }
  );
});

describe("pseudos réservés", () => {
  it("contient tous les mots exigés", () => {
    for (const slug of REQUIRED_RESERVED) {
      expect(RESERVED_SLUGS, slug).toContain(slug);
    }
  });

  it("couvre tous les chemins déjà utilisés par l'application (dossiers de src/app et de public)", () => {
    const ignoredFiles = new Set([
      "layout", "page", "not-found", "globals", "error", "loading",
      "template", "default", "proxy",
    ]);
    const names = new Set<string>();

    for (const entry of readdirSync(path.resolve("src/app"), { withFileTypes: true })) {
      if (entry.name.startsWith("[") || entry.name.startsWith("(")) continue;
      names.add(entry.isDirectory() ? entry.name : entry.name.replace(/\.[^.]+$/, ""));
    }
    for (const entry of readdirSync(path.resolve("public"), { withFileTypes: true })) {
      names.add(entry.isDirectory() ? entry.name : entry.name.replace(/\.[^.]+$/, ""));
    }

    const missing = [...names]
      .filter((name) => !ignoredFiles.has(name))
      // Seuls les noms qui pourraient être un pseudo valide nous concernent.
      .filter((name) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name))
      .filter((name) => !RESERVED_SLUGS.includes(name));

    expect(missing, `chemins non réservés : ${missing.join(", ")}`).toEqual([]);
  });

  it("la liste TypeScript est identique à celle de la migration SQL", () => {
    const sql = readMigration("0018_multi_tenant_slugs.sql");
    const body = sql.slice(
      sql.indexOf("create or replace function public.is_reserved_slug"),
      sql.indexOf("::text[])")
    );
    const fromSql = [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    expect(fromSql).toEqual([...RESERVED_SLUGS].sort());
  });
});

describe("règles de pseudo dans la base (vrai PostgreSQL)", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createDb();
    await applyMigrations(db);
  });
  afterAll(() => db.close());

  const slugOf = async (id: string) =>
    (await db.query<{ slug: string }>(`select slug from public.artists where id = $1`, [id])).rows[0]?.slug;

  it("la base et l'application donnent le même verdict pour chaque cas", async () => {
    const samples = [
      "mon-studio", "abc", "ab", "", "x".repeat(30), "x".repeat(31), "Mon-Studio",
      "mon studio", "mon_studio", "-studio", "studio-", "mon--studio", "étoile",
      "admin", "tattflow", "api", "404", "0-0", "a-b-c",
    ];
    for (const sample of samples) {
      const rows = await runAs<{ code: string | null }>(
        db, asService, `select public.validate_slug($1) as code`, [sample]
      );
      expect(rows[0].code, JSON.stringify(sample)).toBe(validateSlug(sample));
    }
  });

  it("un pseudo valide est accepté à l'inscription", async () => {
    const id = await signup(db, { slug: "alpha-ink", displayName: "Alpha" });
    expect(await slugOf(id)).toBe("alpha-ink");
  });

  it.each([
    ["réservé : admin", "admin", "reserved"],
    ["réservé : tattflow", "tattflow", "reserved"],
    ["réservé : dashboard", "dashboard", "reserved"],
    ["majuscules", "Alpha-Ink", "invalid_format"],
    ["espace", "mon studio", "invalid_format"],
    ["caractère interdit", "mon_studio", "invalid_format"],
    ["accent", "étoile", "invalid_format"],
    ["tiret au début", "-alpha", "invalid_format"],
    ["tiret à la fin", "alpha-", "invalid_format"],
    ["trop court", "ab", "too_short"],
    ["trop long", "x".repeat(31), "too_long"],
  ])("inscription refusée : %s", async (_label, slug, code) => {
    await expect(signup(db, { slug })).rejects.toThrow(`slug_invalid:${code}`);
  });

  it("inscription refusée : pseudo déjà pris", async () => {
    await signup(db, { slug: "deja-pris" });
    await expect(signup(db, { slug: "deja-pris" })).rejects.toThrow(/duplicate key|unique/i);
  });

  it("sans pseudo dans les métadonnées, un pseudo valide est fabriqué", async () => {
    const id = await signup(db, { displayName: "Sans pseudo" });
    const slug = await slugOf(id);
    expect(slug).toMatch(/^tatoueur-[a-f0-9]{8}$/);
    expect(validateSlug(slug)).toBeNull();
  });

  describe("changement de pseudo et historique de 90 jours", () => {
    const change = (artistId: string, slug: string) =>
      runAs<{ slug: string }>(
        db, asService,
        `select public.change_artist_slug($1, $2) as slug`, [artistId, slug]
      );

    it("l'ancien pseudo est gardé 90 jours, personne d'autre ne peut le prendre", async () => {
      const a = await signup(db, { slug: "histoire-a" });
      await change(a, "histoire-b");
      expect(await slugOf(a)).toBe("histoire-b");

      const history = await db.query<{ artist_id: string; days: number }>(
        `select artist_id, round(extract(epoch from (expires_at - retired_at)) / 86400)::int as days
         from public.artist_slug_history where old_slug = 'histoire-a'`
      );
      expect(history.rows).toEqual([{ artist_id: a, days: 90 }]);

      await expect(signup(db, { slug: "histoire-a" })).rejects.toThrow(/slug_held/);
      const other = await signup(db, { slug: "histoire-autre" });
      await expect(change(other, "histoire-a")).rejects.toThrow(/slug_held/);
    });

    it("après 90 jours, l'ancien pseudo est de nouveau disponible", async () => {
      const a = await signup(db, { slug: "expire-a" });
      await change(a, "expire-b");
      await db.query(
        `update public.artist_slug_history set expires_at = now() - interval '1 day' where old_slug = 'expire-a'`
      );
      const b = await signup(db, { slug: "expire-a" });
      expect(await slugOf(b)).toBe("expire-a");
    });

    it("le tatoueur peut reprendre son propre ancien pseudo", async () => {
      const a = await signup(db, { slug: "reprise-a" });
      await change(a, "reprise-b");
      await change(a, "reprise-a");
      expect(await slugOf(a)).toBe("reprise-a");
      const rows = await db.query<{ old_slug: string }>(
        `select old_slug from public.artist_slug_history where artist_id = $1 order by old_slug`, [a]
      );
      expect(rows.rows.map((r) => r.old_slug)).toEqual(["reprise-b"]);
    });

    it("plusieurs changements d'affilée : tous les anciens liens pointent vers le même tatoueur", async () => {
      const a = await signup(db, { slug: "chaine-1" });
      await change(a, "chaine-2");
      await change(a, "chaine-3");
      const rows = await db.query<{ old_slug: string }>(
        `select old_slug from public.artist_slug_history where artist_id = $1 order by old_slug`, [a]
      );
      expect(rows.rows.map((r) => r.old_slug)).toEqual(["chaine-1", "chaine-2"]);
    });

    it.each([
      ["réservé", "admin", /slug_invalid:reserved/],
      ["mal formé", "Mon Studio", /slug_invalid:invalid_format/],
      ["trop court", "ab", /slug_invalid:too_short/],
    ])("changement refusé (%s) : rien n'est modifié", async (_label, slug, message) => {
      const a = await signup(db, { slug: `refus-${slug.length}-${_label.length}` });
      const before = await slugOf(a);
      await expect(change(a, slug)).rejects.toThrow(message);
      expect(await slugOf(a)).toBe(before);
      const history = await db.query(
        `select 1 from public.artist_slug_history where artist_id = $1`, [a]
      );
      expect(history.rows).toHaveLength(0);
    });

    it("changement refusé si le pseudo est déjà pris, et l'historique n'est pas pollué", async () => {
      const a = await signup(db, { slug: "pris-a" });
      await signup(db, { slug: "pris-b" });
      await expect(change(a, "pris-b")).rejects.toThrow(/duplicate key|unique/i);
      expect(await slugOf(a)).toBe("pris-a");
      const history = await db.query(
        `select 1 from public.artist_slug_history where artist_id = $1`, [a]
      );
      expect(history.rows).toHaveLength(0);
    });

    it("changer pour le pseudo actuel ne fait rien", async () => {
      const a = await signup(db, { slug: "meme-pseudo" });
      const rows = await change(a, "meme-pseudo");
      expect(rows[0].slug).toBe("meme-pseudo");
      const history = await db.query(
        `select 1 from public.artist_slug_history where artist_id = $1`, [a]
      );
      expect(history.rows).toHaveLength(0);
    });

    it("un compte inconnu est refusé", async () => {
      await expect(
        change("00000000-0000-0000-0000-00000000dead", "pseudo-inconnu")
      ).rejects.toThrow(/artist_not_found/);
    });
  });

  describe("droits : le navigateur ne peut rien contourner", () => {
    it("un tatoueur connecté ne peut pas appeler change_artist_slug directement", async () => {
      const a = await signup(db, { slug: "droit-a" });
      await expect(
        runAs(db, asUser(a), `select public.change_artist_slug($1, 'pirate-ok')`, [a])
      ).rejects.toThrow(/permission denied/i);
      await expect(
        runAs(db, asAnon, `select public.change_artist_slug($1, 'pirate-ok')`, [a])
      ).rejects.toThrow(/permission denied/i);
    });

    it("un tatoueur connecté ne peut pas modifier son pseudo directement", async () => {
      const a = await signup(db, { slug: "droit-b" });
      await expect(
        runAs(db, asUser(a), `update public.artists set slug = 'pirate-direct' where id = $1`, [a])
      ).rejects.toThrow(/permission denied/i);
    });

    it("l'historique des pseudos est invisible pour un tatoueur et un visiteur", async () => {
      const a = await signup(db, { slug: "droit-c" });
      await expect(
        runAs(db, asUser(a), `select * from public.artist_slug_history`)
      ).rejects.toThrow(/permission denied/i);
      await expect(
        runAs(db, asAnon, `select * from public.artist_slug_history`)
      ).rejects.toThrow(/permission denied/i);
    });

    it("même le serveur ne peut pas poser un pseudo invalide par une écriture directe", async () => {
      const a = await signup(db, { slug: "droit-d" });
      await expect(
        runAs(db, asService, `update public.artists set slug = 'admin' where id = $1`, [a])
      ).rejects.toThrow(/slug_invalid:reserved/);
    });
  });
});
