// Verifies the PgQuery builder: from().rpc() executes a PostgreSQL function,
// writes THROW (preserving err.code for idempotency guards), and reads keep the
// { data, error } contract. The /api/soft-holds route depends on from().rpc();
// the webhook + plan-payment idempotency guards depend on writes throwing 23505.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

import test from "node:test";
import assert from "node:assert/strict";

import { pool } from "../src/lib/db/connection.ts";
import { supabase } from "../src/lib/db/supabase.ts";

const calls: any[] = [];

(pool as any).query = async (sql: string, params?: any) => {
  calls.push({ sql, params });
  if (sql.includes("force_error") || (params || []).includes("force_error")) {
    const err = new Error("relation does not exist") as any;
    err.code = "42P01";
    throw err;
  }
  if (sql.includes("reserve_capacity_slot")) {
    return { rows: [{ id: "slot-1", booked: 4, capacity: 4 }] };
  }
  if (sql.startsWith("INSERT")) {
    const err = new Error("duplicate key value violates unique constraint") as any;
    err.code = "23505";
    throw err;
  }
  return { rows: [] };
};

test("from().rpc() compiles to SELECT * FROM fn($1..) via the pool", async () => {
  const { data } = await supabase
    .from("slots")
    .rpc("reserve_capacity_slot", {
      p_slot_id: "slot-1",
      p_listing_id: "listing-1",
      p_headcount: 4,
    })
    .maybeSingle();

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /SELECT \* FROM reserve_capacity_slot\(\$1, \$2, \$3\)/);
  assert.deepEqual(calls[0].params, ["slot-1", "listing-1", 4]);
  assert.equal((data as any).booked, 4);
});

test("top-level supabase.rpc() is available (sweepExpiredHolds path)", async () => {
  const result = await supabase.rpc("release_expired_holds");
  assert.equal((result.data as any).length, 0);
  assert.equal(result.error, null);
});

test("writes THROW, preserving err.code 23505 for idempotency", async () => {
  await assert.rejects(
    async () => { await supabase.from("processed_webhooks").insert({ gateway_transaction_ref: "dup" }); },
    (err: any) => err?.code === "23505"
  );
});

test("select errors do NOT throw; they resolve with { data, error }", async () => {
  const { data, error } = await supabase.from("slots").select().eq("id", "force_error");
  assert.equal(data, null);
  assert.equal((error as any).code, "42P01");
});
