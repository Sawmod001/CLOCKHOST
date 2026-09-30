// Set dummy env vars before any module imports trigger supabase client creation
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

import test from "node:test";
import assert from "node:assert/strict";

import { finalizeGroupPlan, computeShareKobo } from "../src/lib/bookings/group-booking.ts";

function planRow({ status = "active", target = 8 }: any = {}): any {
  return {
    id: "plan-1",
    listing_id: "listing-1",
    slot_id: "slot-1",
    created_by: "user-1",
    target_headcount: target,
    event_start: new Date("2026-08-20T14:00:00.000Z"),
    event_end: new Date("2026-08-20T18:00:00.000Z"),
    status,
    expires_at: new Date(Date.now() + 86400000),
    finalized_booking_id: null,
  };
}

function fakeClient({ members, capacityOk = true }: any): any {
  const calls: any = { cancelled: 0 };
  return {
    calls,
    query: async (sql: string) => {
      if (/BEGIN|COMMIT|ROLLBACK/.test(sql)) return { rows: [] };
      if (sql.startsWith("SELECT * FROM group_plans WHERE id = $1 FOR UPDATE")) {
        return { rows: [planRow()] };
      }
      if (sql.includes("FROM plan_members WHERE plan_id = $1 FOR UPDATE")) {
        return { rows: members };
      }
      if (sql.includes("reserve_capacity_slot")) {
        return capacityOk
          ? { rows: [{ id: "slot-1", booked: 5, capacity: 10 }] }
          : { rows: [] };
      }
      if (sql.startsWith("INSERT INTO bookings")) {
        return { rows: [{ id: "booking-1", listing_id: "listing-1", status: "confirmed", total_amount_kobo: 40000 }] };
      }
      if (sql.includes("status = 'finalized'")) return { rows: [{ id: "plan-1" }] };
      if (sql.includes("status = 'cancelled'")) {
        calls.cancelled++;
        return { rows: [{ id: "plan-1" }] };
      }
      if (sql.includes("UPDATE plan_members SET status = 'confirmed'")) return { rows: [] };
      return { rows: [] };
    },
  };
}

const paidMembers: any[] = [
  { headcount: 4, share_amount_kobo: 20000, status: "paid" },
  { headcount: 4, share_amount_kobo: 20000, status: "paid" },
];

test("finalizeGroupPlan creates a confirmed booking reusing reserve_capacity_slot", async () => {
  const client = fakeClient({ members: paidMembers });
  const result = await finalizeGroupPlan({ planId: "plan-1", poolClient: client });

  assert.equal(result.ok, true);
  assert.equal(result.status, 201);
  assert.equal(result.data.bookingId, "booking-1");
  assert.equal(result.data.totalAmountKobo, 40000);
  assert.equal(result.data.headcount, 8);
});

test("finalizeGroupPlan waits when not all members have paid", async () => {
  const client = fakeClient({
    members: [
      { headcount: 4, share_amount_kobo: 20000, status: "paid" },
      { headcount: 4, share_amount_kobo: 20000, status: "pending" },
    ],
  });
  const result = await finalizeGroupPlan({ planId: "plan-1", poolClient: client });

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.match(result.error, /Not all members have paid/);
});

test("finalizeGroupPlan cancels a plan when the slot fills up in the meantime", async () => {
  const client = fakeClient({ members: paidMembers, capacityOk: false });
  const result = await finalizeGroupPlan({ planId: "plan-1", poolClient: client });

  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.match(result.error, /became full/);
  assert.equal(client.calls.cancelled, 1);
});

test("computeShareKobo prices headcount × hours × base rate plus add-ons", () => {
  const listing: any = {
    pricing: { baseRatePerHour: 5000 },
    add_ons: [{ id: "sound", priceInKobo: 10000 }, { id: "drinks", priceInKobo: 5000 }],
  };
  const plan: any = {
    event_start: new Date("2026-08-20T14:00:00.000Z"),
    event_end: new Date("2026-08-20T18:00:00.000Z"),
  };
  const share = computeShareKobo({ listing, plan, headcount: 2, addOns: ["sound", "sound"] });
  // 2 people × 4 hours × 5000 = 40000 + 10000 (deduped add-on) = 50000
  assert.equal(share, 50000);
});
