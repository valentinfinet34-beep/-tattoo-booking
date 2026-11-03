import type { PGlite } from "@electric-sql/pglite";
import { runAs, type Actor } from "./db";

/**
 * Imitation minimale de supabase-js : les vraies routes et pages de
 * l'application s'exécutent contre le PostgreSQL en mémoire, sous l'identité
 * (rôle + utilisateur) choisie. Avec le rôle "authenticated", les règles de la
 * base (RLS) s'appliquent ; avec "service_role", elles sont ignorées, ce qui
 * permet de vérifier que le CODE filtre lui-même par tatoueur.
 */

type Row = Record<string, unknown>;
type DbError = { message: string; code?: string };
type Result = { data: unknown; error: DbError | null };
export type QueryLogEntry = { table: string; op: string; sql: string; rowCount: number };

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

function ident(name: string): string {
  if (!IDENTIFIER.test(name)) throw new Error(`Identifiant non autorisé : ${name}`);
  return `"${name}"`;
}

function columnList(columns: string): string {
  if (columns.trim() === "*") return "*";
  return columns
    .split(",")
    .map((c) => ident(c.trim()))
    .join(", ");
}

class QueryBuilder implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "delete" = "select";
  private columns = "*";
  private payload: Row | Row[] | null = null;
  private wheres: string[] = [];
  private params: unknown[] = [];
  private orders: string[] = [];
  private max: number | null = null;
  private expect: "one" | "maybe" | null = null;
  private returning = false;

  constructor(
    private readonly db: PGlite,
    private readonly actor: Actor,
    private readonly table: string,
    private readonly log: QueryLogEntry[]
  ) {}

  select(columns = "*") {
    if (this.op !== "select") this.returning = true;
    this.columns = columns;
    return this;
  }
  insert(payload: Row | Row[]) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  update(payload: Row) {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }

  private where(column: string, operator: string, value: unknown) {
    this.params.push(value);
    this.wheres.push(`${ident(column)} ${operator} $${this.params.length}`);
    return this;
  }
  eq(column: string, value: unknown) {
    return this.where(column, "=", value);
  }
  neq(column: string, value: unknown) {
    return this.where(column, "<>", value);
  }
  gt(column: string, value: unknown) {
    return this.where(column, ">", value);
  }
  gte(column: string, value: unknown) {
    return this.where(column, ">=", value);
  }
  lt(column: string, value: unknown) {
    return this.where(column, "<", value);
  }
  lte(column: string, value: unknown) {
    return this.where(column, "<=", value);
  }
  in(column: string, values: unknown[]) {
    this.params.push(values.map(String));
    this.wheres.push(`${ident(column)}::text = any($${this.params.length}::text[])`);
    return this;
  }
  is(column: string, value: null | boolean) {
    this.wheres.push(`${ident(column)} is ${value === null ? "null" : value}`);
    return this;
  }
  not(column: string, operator: string, value: unknown) {
    if (operator === "is") {
      this.wheres.push(`${ident(column)} is not ${value === null ? "null" : value}`);
      return this;
    }
    throw new Error(`Opérateur non géré dans not() : ${operator}`);
  }
  order(column: string, options: { ascending?: boolean } = {}) {
    this.orders.push(`${ident(column)} ${options.ascending === false ? "desc" : "asc"}`);
    return this;
  }
  limit(count: number) {
    this.max = count;
    return this;
  }
  returns<T>() {
    void (null as T | null);
    return this;
  }
  single() {
    this.expect = "one";
    return this;
  }
  maybeSingle() {
    this.expect = "maybe";
    return this;
  }

  private build(): { sql: string; params: unknown[] } {
    const table = `public.${ident(this.table)}`;
    const where = this.wheres.length ? ` where ${this.wheres.join(" and ")}` : "";
    const returning = columnList(this.columns);

    if (this.op === "select") {
      const order = this.orders.length ? ` order by ${this.orders.join(", ")}` : "";
      const limit = this.max !== null ? ` limit ${this.max}` : "";
      return {
        sql: `select ${returning} from ${table}${where}${order}${limit}`,
        params: this.params,
      };
    }

    if (this.op === "insert") {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
      const keys = Object.keys(rows[0]);
      const params: unknown[] = [];
      const tuples = rows.map(
        (row) =>
          `(${keys
            .map((key) => {
              params.push(row[key]);
              return `$${params.length}`;
            })
            .join(", ")})`
      );
      return {
        sql: `insert into ${table} (${keys.map(ident).join(", ")}) values ${tuples.join(", ")} returning ${returning}`,
        params,
      };
    }

    if (this.op === "update") {
      const payload = this.payload as Row;
      const params: unknown[] = [];
      const sets = Object.keys(payload).map((key) => {
        params.push(payload[key]);
        return `${ident(key)} = $${params.length}`;
      });
      // Les paramètres du where viennent après ceux du set : on les renumérote.
      const shifted = this.wheres.map((clause) =>
        clause.replace(/\$(\d+)/g, (_m, n) => `$${Number(n) + params.length}`)
      );
      return {
        sql: `update ${table} set ${sets.join(", ")}${
          shifted.length ? ` where ${shifted.join(" and ")}` : ""
        } returning ${returning}`,
        params: [...params, ...this.params],
      };
    }

    return {
      sql: `delete from ${table}${where} returning ${returning}`,
      params: this.params,
    };
  }

  private async run(): Promise<Result> {
    let rows: Row[];
    try {
      const { sql, params } = this.build();
      rows = await runAs<Row>(this.db, this.actor, sql, params);
      this.log.push({ table: this.table, op: this.op, sql, rowCount: rows.length });
    } catch (error) {
      const e = error as { message?: string; code?: string };
      return { data: null, error: { message: e.message ?? "erreur", code: e.code } };
    }

    // Comme PostgREST : un update/insert/delete ne renvoie des lignes que si
    // select() a été demandé ensuite.
    const wantsRows = this.op === "select" || this.returning || this.expect !== null;

    if (this.expect === "one") {
      return rows.length === 1
        ? { data: rows[0], error: null }
        : {
            data: null,
            error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" },
          };
    }
    if (this.expect === "maybe") {
      if (rows.length > 1) {
        return { data: null, error: { message: "multiple rows returned", code: "PGRST116" } };
      }
      return { data: rows[0] ?? null, error: null };
    }
    return { data: wantsRows ? rows : null, error: null };
  }

  then<R1 = Result, R2 = never>(
    onfulfilled?: ((value: Result) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

export function createFakeSupabase(db: PGlite, actor: Actor) {
  const log: QueryLogEntry[] = [];

  const userEmail = async (id: string) => {
    const result = await db.query<{ id: string; email: string }>(
      `select id, email from auth.users where id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  };

  return {
    log,
    from: (table: string) => new QueryBuilder(db, actor, table, log),

    async rpc(name: string, args: Row = {}): Promise<Result> {
      const keys = Object.keys(args);
      const sql = `select public.${ident(name)}(${keys
        .map((key, i) => `${ident(key)} => $${i + 1}`)
        .join(", ")}) as result`;
      try {
        const rows = await runAs<{ result: unknown }>(db, actor, sql, keys.map((k) => args[k]));
        return { data: rows[0]?.result ?? null, error: null };
      } catch (error) {
        const e = error as { message?: string; code?: string };
        return { data: null, error: { message: e.message ?? "erreur", code: e.code } };
      }
    },

    auth: {
      async getUser() {
        const user = actor.userId ? await userEmail(actor.userId) : null;
        return { data: { user }, error: null };
      },
      admin: {
        async getUserById(id: string) {
          return { data: { user: await userEmail(id) }, error: null };
        },
      },
    },

    storage: {
      from: (bucket: string) => ({
        upload: async () => ({ error: null }),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.test/${bucket}/${path}` },
        }),
      }),
    },
  };
}

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;
