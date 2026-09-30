import { pool as defaultPool } from "../db/connection";
import { createSoftHold as defaultCreateSoftHold } from "../db/supabase-queries";
import type { PoolClient } from "pg";
import type { DbSoftHold } from "@/types/db";

export interface ReserveCapacitySlotInput {
  slotId: string;
  listingId: string;
  headcount: number;
  expiresInMinutes?: number;
  /** Optional pg PoolClient for use inside a transaction. */
  poolClient?: PoolClient | typeof defaultPool;
  /** Optional factory for creating the soft hold — injectable for tests. */
  createSoftHoldFn?: (data: Partial<DbSoftHold>) => Promise<DbSoftHold>;
}

export type ReserveCapacitySlotResult =
  | {
      ok: true;
      status: 201;
      data: {
        slotId: string;
        softHoldId: string;
        expiresAt: string;
        headcount: number;
        booked: number;
        capacity: number;
      };
    }
  | { ok: false; status: 400 | 409; error: string };

/**
 * Atomically reserve headcount on a slot and create a soft hold.
 * The DB function `reserve_capacity_slot` handles concurrency safety.
 */
export async function reserveCapacitySlot({
  slotId,
  listingId,
  headcount,
  expiresInMinutes = 10,
  poolClient,
  createSoftHoldFn,
}: ReserveCapacitySlotInput): Promise<ReserveCapacitySlotResult> {
  if (!slotId || !listingId || !headcount) {
    return { ok: false, status: 400, error: "Missing reservation parameters" };
  }
  if (headcount < 1) {
    return { ok: false, status: 400, error: "Headcount must be at least 1" };
  }

  const db = poolClient ?? defaultPool;

  const result = await db.query(
    `SELECT * FROM reserve_capacity_slot($1, $2, $3)`,
    [slotId, listingId, headcount]
  );

  const updatedSlot = result.rows[0] as
    | { booked: number; capacity: number }
    | undefined;
  if (!updatedSlot) {
    return { ok: false, status: 409, error: "Slot is full or unavailable" };
  }

  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1_000);
  const createHold = createSoftHoldFn ?? defaultCreateSoftHold;
  const softHold = await createHold({
    slot_id: slotId,
    headcount,
    expires_at: expiresAt.toISOString(),
    booking_id: null,
  });

  return {
    ok: true,
    status: 201,
    data: {
      slotId,
      softHoldId: softHold.id,
      expiresAt: expiresAt.toISOString(),
      headcount,
      booked: updatedSlot.booked,
      capacity: updatedSlot.capacity,
    },
  };
}
