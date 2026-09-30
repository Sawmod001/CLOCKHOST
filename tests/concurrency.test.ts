// Set dummy env vars before any module imports trigger supabase client creation
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

import test from "node:test";
import assert from "node:assert/strict";

import { reserveCapacitySlot } from "../src/lib/bookings/booking.ts";

function fakePool(): any {
  let calls = 0;
  return {
    query: async (sql: string) => {
      calls++;
      if (sql.includes("reserve_capacity_slot")) {
        if (calls > 1) return { rows: [] };
        return {
          rows: [{
            id: "slot-1", listing_id: "listing-1", booked: 4, capacity: 4,
            event_start: "2026-07-20T14:00:00Z", event_end: "2026-07-20T18:00:00Z",
          }],
        };
      }
      return { rows: [] };
    },
  };
}

async function fakeCreateSoftHold(): Promise<any> {
  return {
    id: "soft-hold-1", slot_id: "slot-1", headcount: 4,
    expires_at: new Date(Date.now() + 600000).toISOString(),
    booking_id: null,
  };
}

test("reserveCapacitySlot allows one reservation when capacity is exhausted", async () => {
  const client = fakePool();

  const first = await reserveCapacitySlot({
    slotId: "slot-1",
    listingId: "listing-1",
    headcount: 4,
    poolClient: client,
    createSoftHoldFn: fakeCreateSoftHold,
  });

  const second = await reserveCapacitySlot({
    slotId: "slot-1",
    listingId: "listing-1",
    headcount: 1,
    poolClient: client,
    createSoftHoldFn: fakeCreateSoftHold,
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.status, 409);
});
