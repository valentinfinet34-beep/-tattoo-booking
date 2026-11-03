import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

/**
 * Faux Supabase pour les tests : un vrai PostgreSQL en mémoire (PGlite) avec
 * les rôles, le schéma "auth" et le schéma "storage" que les migrations
 * attendent. Les migrations du dossier supabase/migrations sont rejouées
 * telles quelles, donc les règles de sécurité (RLS) testées sont les vraies.
 */

export const BETA_ARTIST_ID = "54cca618-ee61-48e9-93be-d995160d9ee7";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations");
const ROLLBACK_DIR = path.resolve(process.cwd(), "supabase/rollback");

const BOOTSTRAP = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text,
  name text
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable
as $$ select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)] $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema storage to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Comme Supabase : toute nouvelle table de "public" est accessible aux trois
-- rôles, c'est la RLS et les droits par colonne qui limitent ensuite.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

export function readMigration(file: string): string {
  return readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
}

export function readRollback(file: string): string {
  return readFileSync(path.join(ROLLBACK_DIR, file), "utf8");
}

export async function createDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(BOOTSTRAP);
  return db;
}

/** Rejoue les migrations dans l'ordre. `upTo` est inclus (ex. "0017"). */
export async function applyMigrations(
  db: PGlite,
  options: { from?: string; upTo?: string } = {}
): Promise<void> {
  for (const file of migrationFiles()) {
    const prefix = file.slice(0, 4);
    if (options.from && prefix < options.from) continue;
    if (options.upTo && prefix > options.upTo) continue;
    await db.exec(readMigration(file));
  }
}

export type Actor = {
  role: "anon" | "authenticated" | "service_role";
  userId?: string;
};

export const asUser = (userId: string): Actor => ({
  role: "authenticated",
  userId,
});
export const asAnon: Actor = { role: "anon" };
export const asService: Actor = { role: "service_role" };

/** Exécute une requête avec l'identité (rôle + utilisateur) donnée. */
export async function runAs<T = Record<string, unknown>>(
  db: PGlite,
  actor: Actor,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await db.transaction(async (tx) => {
    await tx.exec(`set local role ${actor.role}`);
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [
      actor.userId ?? "",
    ]);
    return tx.query<T>(sql, params);
  });
  return result.rows;
}

/** Simule une inscription réelle : la ligne "artists" est créée par le déclencheur. */
export async function signup(
  db: PGlite,
  input: { email?: string; slug?: string; displayName?: string; id?: string }
): Promise<string> {
  const id = input.id ?? randomUUID();
  const metadata: Record<string, string> = {};
  if (input.displayName) metadata.display_name = input.displayName;
  if (input.slug !== undefined) metadata.slug = input.slug;
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)`,
    [id, input.email ?? `${id}@example.test`, JSON.stringify(metadata)]
  );
  return id;
}

export async function addProject(
  db: PGlite,
  artistId: string,
  overrides: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    status: string;
    preferred_date: string;
    time_slot: string;
    quoted_price_cents: number;
    deposit_amount_cents: number;
    scheduled_start_time: string;
    duration_hours: number;
    stripe_checkout_url: string;
    no_show: boolean;
  }> = {}
): Promise<string> {
  const row = {
    first_name: "Client",
    last_name: "Test",
    email: "client@example.test",
    status: "pending",
    preferred_date: "2099-01-05",
    time_slot: "10:00",
    ...overrides,
  };
  const columns = [
    "artist_id",
    "phone",
    "description",
    "body_location",
    ...Object.keys(row),
  ];
  const values = [
    artistId,
    "0600000000",
    "Description de test assez longue",
    "Bras",
    ...Object.values(row),
  ];
  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
  const result = await db.query<{ id: string }>(
    `insert into public.projects (${columns.join(", ")}) values (${placeholders}) returning id`,
    values
  );
  return result.rows[0].id;
}

/** Instantané du catalogue : sert à prouver qu'un retour arrière est exact. */
export async function catalogSnapshot(db: PGlite): Promise<string[]> {
  const queries = [
    `select 'table ' || table_name as item from information_schema.tables where table_schema = 'public'`,
    `select 'colonne ' || table_name || '.' || column_name || ':' || data_type as item from information_schema.columns where table_schema = 'public'`,
    `select 'index ' || indexname as item from pg_indexes where schemaname = 'public'`,
    `select 'fonction ' || p.proname as item from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'`,
    `select 'declencheur ' || t.tgname as item from pg_trigger t where not t.tgisinternal`,
    `select 'regle ' || tablename || '.' || policyname as item from pg_policies where schemaname = 'public'`,
  ];
  const items: string[] = [];
  for (const q of queries) {
    const res = await db.query<{ item: string }>(q);
    items.push(...res.rows.map((r) => r.item));
  }
  return items.sort();
}
