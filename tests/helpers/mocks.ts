import type { PGlite } from "@electric-sql/pglite";
import { asService, asUser } from "./db";
import { createFakeSupabase, type FakeSupabase } from "./fake-supabase";

/**
 * Point de branchement des faux modules (vi.mock) : les tests choisissent ici
 * qui est connecté et avec quels droits la base répond.
 */
export const state: { server: FakeSupabase | null; admin: FakeSupabase | null } = {
  server: null,
  admin: null,
};

export const stripeCalls: { sessions: unknown[]; accounts: unknown[] } = {
  sessions: [],
  accounts: [],
};

export const fakeStripe = {
  checkout: {
    sessions: {
      create: async (params: unknown) => {
        stripeCalls.sessions.push(params);
        const id = `cs_test_${stripeCalls.sessions.length}`;
        return { id, url: `https://stripe.test/pay/${id}` };
      },
    },
  },
  accounts: {
    create: async () => {
      stripeCalls.accounts.push({});
      return { id: "acct_test" };
    },
    retrieve: async () => ({ charges_enabled: true }),
  },
  accountLinks: { create: async () => ({ url: "https://stripe.test/onboarding" }) },
  customers: { create: async () => ({ id: "cus_test" }) },
};

/**
 * `userId` : la personne connectée côté tatoueur (null = visiteur).
 * `withRls` : true = la base applique ses règles de sécurité (cas réel) ;
 * false = le client côté tatoueur ignore la RLS, pour vérifier que le CODE
 * filtre déjà par tatoueur.
 */
export function signInAs(
  db: PGlite,
  userId: string | null,
  options: { withRls?: boolean } = {}
) {
  const withRls = options.withRls ?? true;
  state.server = createFakeSupabase(
    db,
    userId === null
      ? { role: "anon" }
      : withRls
        ? asUser(userId)
        : { role: "service_role", userId }
  );
  state.admin = createFakeSupabase(db, asService);
  stripeCalls.sessions.length = 0;
  stripeCalls.accounts.length = 0;
}

/** Parcourt un arbre d'éléments React rendus et récupère toutes les chaînes. */
export function collectStrings(node: unknown, seen = new WeakSet<object>()): string[] {
  if (node === null || node === undefined) return [];
  if (typeof node === "string") return [node];
  if (typeof node === "number" || typeof node === "boolean") return [String(node)];
  if (typeof node !== "object") return [];
  if (seen.has(node as object)) return [];
  seen.add(node as object);

  if (Array.isArray(node)) return node.flatMap((child) => collectStrings(child, seen));

  const record = node as Record<string, unknown>;
  // Élément React : on suit ses props ; objet de données : toutes ses valeurs.
  if ("props" in record && "type" in record) return collectStrings(record.props, seen);
  return Object.values(record).flatMap((value) => collectStrings(value, seen));
}
