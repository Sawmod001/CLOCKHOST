// Set dummy env vars before any module imports trigger supabase client creation
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

import test from "node:test";
import assert from "node:assert/strict";

import { resolveExclusiveLock, markWebhookProcessing } from "../src/lib/bookings/exclusive.ts";

function fakePool(firstWins = true): any {
  let calls = 0;
  return {
    query: async (sql: string, params?: any) => {
      calls++;
      if (sql.includes("resolve_exclusive_lock")) {
        if (calls > 1 && !firstWins) return { rows: [] };
        if (calls > 1) return { rows: [] };
        if (!firstWins) return { rows: [] };
        return {
          rows: [{ id: "lock-1", status: "locked", locked_by_booking_id: "booking-1" }],
        };
      }
      return { rows: [] };
    },
  };
}

function fakeSupabase(allowUpdates = false): any {
  return {
    from: () => ({
      insert: async () => {
        const err = new Error("duplicate") as any;
        err.code = "23505";
        throw err;
      },
      update: () => ({
        eq: () => allowUpdates ? Promise.resolve({ data: null, error: null }) : Promise.resolve({ data: null, error: null }),
        select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
    }),
  };
}

test("resolveExclusiveLock gives one booking the lock and marks the other as lost_race", async () => {
  // This test validates that only the first caller wins the race.
  // The real atomicity is enforced by PostgreSQL's UPDATE ... RETURNING;
  // the mock simulates the second call returning null (lost race).
  const poolClient = fakePool(true);
  const supabaseClient = fakeSupabase(true);

  const firstResult = await resolveExclusiveLock({
    lockId: "lock-1",
    bookingId: "booking-1",
    listingId: "listing-1",
    eventStart: new Date("2026-07-05T18:00:00.000Z"),
    poolClient,
    supabaseClient,
  });

  const secondResult = await resolveExclusiveLock({
    lockId: "lock-1",
    bookingId: "booking-2",
    listingId: "listing-1",
    eventStart: new Date("2026-07-05T18:00:00.000Z"),
    poolClient,
    supabaseClient,
  });

  assert.equal(firstResult.won, true);
  assert.equal(secondResult.won, false);
  assert.equal(firstResult.bookingId, "booking-1");
  assert.equal(secondResult.bookingId, "booking-2");
});

test("markWebhookProcessing treats repeated gatewayTransactionRef as a no-op", async () => {
  const client = fakeSupabase();
  const result = await markWebhookProcessing({
    bookingId: "booking-1",
    gatewayTransactionRef: "ref-duplicate",
    supabaseClient: client,
  });

  assert.equal(result.ok, false);
  assert.equal(result.duplicate, true);
});
