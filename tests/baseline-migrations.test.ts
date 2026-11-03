import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  applyMigrations,
  asUser,
  createDb,
  runAs,
  signup,
} from "./helpers/db";

describe("migrations existantes (0001 à 0017) sur un vrai PostgreSQL", () => {
  describe("avant 0017 : la faille U1 existe", () => {
    let db: PGlite;
    let artistId: string;

    beforeAll(async () => {
      db = await createDb();
      await applyMigrations(db, { upTo: "0016" });
      artistId = await signup(db, { slug: "avant-0017", displayName: "Avant" });
    });
    afterAll(() => db.close());

    it("un tatoueur peut se déclarer abonné et passer en plan Pro (faille reproduite)", async () => {
      await runAs(
        db,
        asUser(artistId),
        `update public.artists set subscription_status = 'active', subscription_plan = 'pro' where id = $1`,
        [artistId]
      );
      const rows = await db.query<{ subscription_status: string }>(
        `select subscription_status from public.artists where id = $1`,
        [artistId]
      );
      expect(rows.rows[0].subscription_status).toBe("active");
    });
  });

  describe("après 0017 : la faille est fermée", () => {
    let db: PGlite;
    let artistId: string;

    beforeAll(async () => {
      db = await createDb();
      await applyMigrations(db, { upTo: "0017" });
      artistId = await signup(db, { slug: "apres-0017", displayName: "Apres" });
    });
    afterAll(() => db.close());

    it("la migration 0017 passe sa propre auto-vérification", () => {
      // Si l'auto-vérification avait échoué, applyMigrations aurait levé une erreur.
      expect(artistId).toBeTruthy();
    });

    it("le tatoueur peut encore modifier ses réglages", async () => {
      await runAs(
        db,
        asUser(artistId),
        `update public.artists set welcome_message = 'Bonjour', city = 'Lyon' where id = $1`,
        [artistId]
      );
      const rows = await db.query<{ welcome_message: string }>(
        `select welcome_message from public.artists where id = $1`,
        [artistId]
      );
      expect(rows.rows[0].welcome_message).toBe("Bonjour");
    });

    it.each([
      "subscription_status",
      "subscription_plan",
      "stripe_account_id",
      "stripe_charges_enabled",
      "stripe_customer_id",
      "stripe_subscription_id",
      "slug",
    ])("le tatoueur ne peut plus écrire %s", async (column) => {
      const value = column === "stripe_charges_enabled" ? "true" : "'x-valeur'";
      await expect(
        runAs(
          db,
          asUser(artistId),
          `update public.artists set ${column} = ${value} where id = $1`,
          [artistId]
        )
      ).rejects.toThrow(/permission denied/i);
    });
  });
});
