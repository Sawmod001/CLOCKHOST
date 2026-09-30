import { pool } from "./connection";
import type { PoolClient } from "pg";

// ─── Filter types ─────────────────────────────────────────────────────────────

type FilterOp =
  | "eq" | "neq" | "gt" | "lt" | "gte" | "lte"
  | "like" | "ilike" | "in" | "contains";

interface Filter {
  op: FilterOp;
  key: string;
  value?: unknown;
  values?: unknown[];
}

interface OrFilter {
  key: string;
  op: string;
  value: unknown;
}

interface OrderClause {
  field: string;
  dir: "ASC" | "DESC";
}

type OperationType = "insert" | "update" | "delete" | "rpc";

interface InsertOperation {
  type: "insert";
  data: Record<string, unknown>;
}
interface UpdateOperation {
  type: "update";
  data: Record<string, unknown>;
}
interface DeleteOperation {
  type: "delete";
  data?: never;
}
interface UpsertOperation {
  type: "upsert";
  data: Record<string, unknown>;
  onConflict?: string;
}
interface RpcOperation {
  type: "rpc";
  fn: string;
  args: Record<string, unknown>;
  data?: never;
}

type Operation = InsertOperation | UpdateOperation | DeleteOperation | UpsertOperation | RpcOperation;

// ─── Result shapes ────────────────────────────────────────────────────────────

export interface DbResult<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

export interface DbCountResult {
  data: null;
  error: null;
  count: number;
}

// ─── SelectConfig — passed to .select() when doing a COUNT query ──────────────

interface SelectCountConfig {
  count: "exact";
  head: boolean;
}

// ─── PgQuery ──────────────────────────────────────────────────────────────────

class PgQuery<T = Record<string, unknown>> {
  private _table: string;
  private _select: string | SelectCountConfig;
  private _filters: Filter[];
  private _orFilters: OrFilter[];
  private _order: OrderClause | null;
  private _rangeOffset: number | null;
  private _rangeLimit: number | null;
  private _single: boolean;
  private _maybeSingle: boolean;
  private _countExact: boolean;
  private _head: boolean;
  private _operation: Operation | null;

  constructor(table: string) {
    this._table = table;
    this._select = "*";
    this._filters = [];
    this._orFilters = [];
    this._order = null;
    this._rangeOffset = null;
    this._rangeLimit = null;
    this._single = false;
    this._maybeSingle = false;
    this._countExact = false;
    this._head = false;
    this._operation = null;
  }

  select(columns?: string | SelectCountConfig, opts?: SelectCountConfig): this {
    const countCfg =
      opts ??
      (columns && typeof columns === "object" && "count" in columns
        ? columns
        : undefined);
    if (countCfg) {
      this._countExact = countCfg.count === "exact";
      this._head = !!countCfg.head;
    }
    if (
      columns &&
      typeof columns === "object" &&
      "count" in columns
    ) {
      this._select = columns;
    } else {
      this._select = (columns as string | undefined) ?? "*";
    }
    return this;
  }

  eq(key: string, value: unknown): this {
    if (value === undefined || value === null) return this;
    this._filters.push({ op: "eq", key, value });
    return this;
  }

  neq(key: string, value: unknown): this {
    if (value === undefined || value === null) return this;
    this._filters.push({ op: "neq", key, value });
    return this;
  }

  gt(key: string, value: unknown): this {
    if (value === undefined || value === null) return this;
    this._filters.push({ op: "gt", key, value });
    return this;
  }

  lt(key: string, value: unknown): this {
    if (value === undefined || value === null) return this;
    this._filters.push({ op: "lt", key, value });
    return this;
  }

  gte(key: string, value: unknown): this {
    if (value === undefined || value === null) return this;
    this._filters.push({ op: "gte", key, value });
    return this;
  }

  lte(key: string, value: unknown): this {
    if (value === undefined || value === null) return this;
    this._filters.push({ op: "lte", key, value });
    return this;
  }

  in(key: string, values: unknown[]): this {
    if (!values || values.length === 0) return this;
    this._filters.push({ op: "in", key, values });
    return this;
  }

  or(conditions: string): this {
    if (!conditions) return this;
    const parts = conditions.split(",");
    const orFilters: OrFilter[] = [];
    for (const part of parts) {
      const match = part
        .trim()
        .match(
          /^([a-zA-Z_][a-zA-Z0-9_]*\.?[a-zA-Z0-9_]*)\.(eq|neq|gt|lt|gte|lte|like|ilike)\.(.+)$/
        );
      if (match) {
        const [, key, op, rawValue] = match as [string, string, string, string];
        const value = rawValue === "null" ? null : rawValue;
        orFilters.push({ key, op, value });
      }
    }
    if (orFilters.length > 0) {
      this._orFilters = orFilters;
    }
    return this;
  }

  contains(key: string, values: unknown | unknown[]): this {
    if (!values) return this;
    const arr = Array.isArray(values) ? values : [values];
    this._filters.push({ op: "contains", key, values: arr });
    return this;
  }

  order(field: string, opts: { ascending?: boolean } = {}): this {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
      throw new Error(`Invalid order field: ${field}`);
    }
    this._order = { field, dir: opts.ascending ? "ASC" : "DESC" };
    return this;
  }

  range(from: number, to: number): this {
    this._rangeOffset = from;
    this._rangeLimit = to - from + 1;
    return this;
  }

  limit(n: number): this {
    this._rangeLimit = n;
    if (this._rangeOffset === null) this._rangeOffset = 0;
    return this;
  }

  single(): this {
    this._single = true;
    this._maybeSingle = false;
    return this;
  }

  maybeSingle(): this {
    this._maybeSingle = true;
    this._single = false;
    return this;
  }

  insert(data: Record<string, unknown>): this {
    this._operation = { type: "insert", data };
    return this;
  }

  upsert(data: Record<string, unknown>, opts: { onConflict?: string } = {}): this {
    if (opts.onConflict) this._validateIdentifier(opts.onConflict);
    this._operation = { type: "upsert", data, onConflict: opts.onConflict };
    return this;
  }

  rpc(fn: string, args: Record<string, unknown> = {}): this {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fn)) {
      throw new Error(`Invalid function name: ${fn}`);
    }
    this._operation = { type: "rpc", fn, args };
    return this;
  }

  update(data: Record<string, unknown>): this {
    this._operation = { type: "update", data };
    return this;
  }

  delete(): this {
    this._operation = { type: "delete" };
    return this;
  }

  // ─── Promise integration ──────────────────────────────────────────────────

  then<TResult1 = DbResult<T> | DbCountResult, TResult2 = never>(
    resolve: (value: DbResult<T> | DbCountResult) => TResult1 | PromiseLike<TResult1>,
    reject?: (reason: unknown) => TResult2 | PromiseLike<TResult2>
  ): Promise<TResult1 | TResult2> {
    return this._execute().then(resolve, reject);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private _validateIdentifier(name: string): void {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(`Invalid identifier: ${name}`);
    }
  }

  private _mapColumn(key: string): string {
    if (key.includes("->>")) {
      const parts = key.split("->>");
      if (parts.length !== 2) throw new Error(`Invalid column: ${key}`);
      const [col, jsonKey] = parts as [string, string];
      this._validateIdentifier(col);
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(jsonKey))
        throw new Error(`Invalid JSON key: ${jsonKey}`);
      return `${col}->>'${jsonKey}'`;
    }
    if (key.includes("->")) {
      const parts = key.split("->");
      if (parts.length !== 2) throw new Error(`Invalid column: ${key}`);
      const [col, jsonKey] = parts as [string, string];
      this._validateIdentifier(col);
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(jsonKey))
        throw new Error(`Invalid JSON key: ${jsonKey}`);
      return `${col}->'${jsonKey}'`;
    }
    if (key.includes(".")) {
      const segments = key.split(".");
      for (const seg of segments) this._validateIdentifier(seg);
      return key;
    }
    this._validateIdentifier(key);
    return key;
  }

  private _buildFilterSql(params: unknown[], startIdx: number): string {
    let idx = startIdx;
    const clauses: { sql: string; params: unknown[] }[] = [];

    for (const f of this._filters) {
      if (f.op === "eq") {
        idx++;
        clauses.push({ sql: `${this._mapColumn(f.key)} = $${idx}`, params: [f.value] });
      } else if (f.op === "neq") {
        idx++;
        clauses.push({ sql: `${this._mapColumn(f.key)} != $${idx}`, params: [f.value] });
      } else if (f.op === "in") {
        const ph = (f.values ?? []).map(() => { idx++; return `$${idx}`; }).join(", ");
        clauses.push({ sql: `${this._mapColumn(f.key)} IN (${ph})`, params: f.values ?? [] });
      } else if (f.op === "gt") {
        idx++;
        clauses.push({ sql: `${this._mapColumn(f.key)} > $${idx}`, params: [f.value] });
      } else if (f.op === "lt") {
        idx++;
        clauses.push({ sql: `${this._mapColumn(f.key)} < $${idx}`, params: [f.value] });
      } else if (f.op === "gte") {
        idx++;
        clauses.push({ sql: `${this._mapColumn(f.key)} >= $${idx}`, params: [f.value] });
      } else if (f.op === "lte") {
        idx++;
        clauses.push({ sql: `${this._mapColumn(f.key)} <= $${idx}`, params: [f.value] });
      } else if (f.op === "contains") {
        idx++;
        clauses.push({ sql: `${this._mapColumn(f.key)} @> $${idx}::text[]`, params: [f.values] });
      } else if (f.op === "like") {
        idx++;
        clauses.push({ sql: `${this._mapColumn(f.key)} LIKE $${idx}`, params: [f.value] });
      } else if (f.op === "ilike") {
        idx++;
        clauses.push({ sql: `${this._mapColumn(f.key)} ILIKE $${idx}`, params: [f.value] });
      }
    }

    // Handle OR filters
    if (this._orFilters.length > 0) {
      const orParts: { sql: string; params: unknown[] }[] = [];
      for (const f of this._orFilters) {
        idx++;
        if (f.op === "eq") {
          orParts.push({ sql: `${this._mapColumn(f.key)} = $${idx}`, params: [f.value] });
        } else if (f.op === "ilike") {
          orParts.push({ sql: `${this._mapColumn(f.key)} ILIKE $${idx}`, params: [f.value] });
        } else if (f.op === "like") {
          orParts.push({ sql: `${this._mapColumn(f.key)} LIKE $${idx}`, params: [f.value] });
        } else if (f.op === "neq") {
          orParts.push({ sql: `${this._mapColumn(f.key)} != $${idx}`, params: [f.value] });
        } else if (f.op === "gt") {
          orParts.push({ sql: `${this._mapColumn(f.key)} > $${idx}`, params: [f.value] });
        } else if (f.op === "lt") {
          orParts.push({ sql: `${this._mapColumn(f.key)} < $${idx}`, params: [f.value] });
        } else if (f.op === "gte") {
          orParts.push({ sql: `${this._mapColumn(f.key)} >= $${idx}`, params: [f.value] });
        } else if (f.op === "lte") {
          orParts.push({ sql: `${this._mapColumn(f.key)} <= $${idx}`, params: [f.value] });
        }
      }
      if (orParts.length > 0) {
        for (const p of orParts) params.push(...p.params);
        clauses.push({ sql: `(${orParts.map((p) => p.sql).join(" OR ")})`, params: [] });
      }
    }

    for (const c of clauses) {
      params.push(...c.params);
    }
    if (clauses.length === 0) return "";
    return " WHERE " + clauses.map((c) => c.sql).join(" AND ");
  }

  private async _execute(): Promise<DbResult<T> | DbCountResult> {
    if (this._operation) return this._execOperation();
    return this._execSelect();
  }

  private async _execSelect(): Promise<DbResult<T> | DbCountResult> {
    const params: unknown[] = [];
    if (this._table && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this._table)) {
      throw new Error(`Invalid table: ${this._table}`);
    }

    const selectExpr =
      typeof this._select === "string" ? this._select : "*";

    let sql = `SELECT ${selectExpr} FROM ${this._table}`;

    if (this._countExact && this._head) {
      sql = `SELECT COUNT(*) AS cnt FROM ${this._table}`;
    }

    sql += this._buildFilterSql(params, 0);

    if (this._countExact && this._head) {
      try {
        const result = await pool.query(sql, params as unknown[]);
        const cnt = parseInt(String(result.rows[0]?.cnt ?? "0"), 10);
        return { data: null, error: null, count: cnt } as DbCountResult;
      } catch (err) {
        const e = err as Error & { code?: string };
        return { data: null, error: { message: e.message }, count: 0 } as unknown as DbCountResult;
      }
    }

    if (this._order) {
      sql += ` ORDER BY ${this._order.field} ${this._order.dir}`;
    }
    if (this._rangeLimit !== null) sql += ` LIMIT ${this._rangeLimit}`;
    if (this._rangeOffset !== null) sql += ` OFFSET ${this._rangeOffset}`;
    if (this._single || this._maybeSingle) sql += " LIMIT 1";

    try {
      const result = await pool.query(sql, params as unknown[]);
      let data: T | T[] | null = result.rows as T[];
      if (this._single) {
        const row = (result.rows as T[])[0] ?? null;
        if (!row) return { data: null, error: { message: "Not found" } };
        return { data: row, error: null };
      }
      if (this._maybeSingle) {
        return { data: ((result.rows as T[])[0] ?? null), error: null };
      }
      return { data: data as T, error: null };
    } catch (err) {
      const e = err as Error & { code?: string };
      return { data: null, error: { message: e.message, code: e.code } };
    }
  }

  private async _execOperation(): Promise<DbResult<T>> {
    const op = this._operation!;
    const params: unknown[] = [];
    let sql = "";

    if (op.type === "insert") {
      const keys = Object.keys(op.data);
      for (const k of keys) this._validateIdentifier(k);
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this._table))
        throw new Error(`Invalid table: ${this._table}`);
      const values = Object.values(op.data);
      const cols = keys.join(", ");
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
      sql = `INSERT INTO ${this._table} (${cols}) VALUES (${placeholders})`;
      params.push(...values);
    } else if (op.type === "update") {
      const keys = Object.keys(op.data);
      for (const k of keys) this._validateIdentifier(k);
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this._table))
        throw new Error(`Invalid table: ${this._table}`);
      const values = Object.values(op.data);
      const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
      sql = `UPDATE ${this._table} SET ${sets}`;
      params.push(...values);
    } else if (op.type === "delete") {
      sql = `DELETE FROM ${this._table}`;
    } else if (op.type === "upsert") {
      const keys = Object.keys(op.data);
      for (const k of keys) this._validateIdentifier(k);
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this._table))
        throw new Error(`Invalid table: ${this._table}`);
      const values = Object.values(op.data);
      const cols = keys.join(", ");
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
      sql = `INSERT INTO ${this._table} (${cols}) VALUES (${placeholders})`;
      params.push(...values);
      if (op.onConflict) {
        const sets = keys
          .filter((k) => k !== op.onConflict)
          .map((k) => `${k} = EXCLUDED.${k}`)
          .join(", ");
        sql += ` ON CONFLICT (${op.onConflict}) DO UPDATE SET ${sets}`;
      } else {
        sql += " ON CONFLICT DO NOTHING";
      }
    } else if (op.type === "rpc") {
      const values = Object.values(op.args);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
      sql = `SELECT * FROM ${op.fn}(${placeholders})`;
      params.push(...values);
    }

    const filterSql = this._buildFilterSql(params, params.length);
    sql += filterSql;

    if (op.type === "insert" || op.type === "update" || op.type === "upsert") {
      sql += " RETURNING *";
    }

    try {
      const result = await pool.query(sql, params as unknown[]);
      if (this._single) {
        const row = (result.rows as T[])[0] ?? null;
        if (!row) return { data: null, error: { message: "Not found" } };
        return { data: row, error: null };
      }
      if (this._maybeSingle) {
        return { data: ((result.rows as T[])[0] ?? null), error: null };
      }
      return { data: result.rows as unknown as T, error: null };
    } catch (err) {
      // Writes throw (preserving err.code e.g. 23505) so idempotency guards
      // and callers that expect exceptions keep working as designed.
      if (op.type !== "rpc") throw err;
      const e = err as Error & { code?: string };
      return { data: null, error: { message: e.message, code: e.code } };
    }
  }
}

// ─── Exported client ──────────────────────────────────────────────────────────

export const supabase = {
  /** Start a query against a named table. */
  from<T = Record<string, unknown>>(table: string): PgQuery<T> {
    return new PgQuery<T>(table);
  },

  /** Call a stored PostgreSQL function. */
  rpc<T = Record<string, unknown>>(
    fn: string,
    args: Record<string, unknown> = {}
  ): PgQuery<T> {
    return new PgQuery<T>("").rpc(fn, args) as unknown as PgQuery<T>;
  },
};

/**
 * Run a function inside a Postgres transaction.
 * Commits on success, rolls back on error.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
