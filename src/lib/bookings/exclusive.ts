import { pool } from "../db/connection";
import { supabase } from "../db/supabase";
import type { PoolClient } from "pg";

export interface ResolveExclusiveLockInput {
  lockId: string;
  bookingId: string;
  listingId: string;
  eventStart: string | Date;
  poolClient?: PoolClient | typeof pool;
  supabaseClient?: typeof supabase;
}

export type ResolveExclusiveLockResult =
  | { won: true; bookingId: string; lock: Record<string, unknown> }
  | { won: false; bookingId: string }
  | { ok: false; error: string; bookingId?: string };

/**
 * Attempt to win the exclusive lock for a booking via the DB function
 * `resolve_exclusive_lock`. Handles both real race conditions and transient errors.
 */
export async function resolveExclusiveLock({
  lockId,
  bookingId,
  listingId,
  eventStart,
  poolClient,
  supabaseClient,
}: ResolveExclusiveLockInput): Promise<ResolveExclusiveLockResult> {
  if (!lockId || !bookingId || !listingId || !eventStart) {
    return { ok: false, error: "Missing exclusive lock parameters" };
  }

  const dbClient = poolClient ?? pool;
  const dbSupabase = supabaseClient ?? supabase;

  try {
    const startStr =
      eventStart instanceof Date ? eventStart.toISOString() : eventStart;
    const result = await dbClient.query(
      `SELECT * FROM resolve_exclusive_lock($1, $2, $3, $4)`,
      [lockId, bookingId, listingId, startStr]
    );

    if (!result.rows.length) {
      await dbSupabase
        .from("bookings")
        .update({ status: "lost_race" })
        .eq("id", bookingId);
      return { won: false, bookingId };
    }

    return { won: true, bookingId, lock: result.rows[0] as Record<string, unknown> };
  } catch (error) {
    // PostgreSQL 40001 = serialization_failure; 23505 = unique_violation
    // Both indicate a real race — mark booking as lost.
    // Any other error is transient and should not mark the booking as lost.
    const code = (error as { code?: string })?.code;
    const isRealRace = code === "40001" || code === "23505";

    if (!isRealRace) {
      console.error("resolveExclusiveLock transient error:", error);
      return {
        ok: false,
        error: "Transient database error, please retry",
        bookingId,
      };
    }

    await dbSupabase
      .from("bookings")
      .update({ status: "lost_race" })
      .eq("id", bookingId);
    return { won: false, bookingId };
  }
}

export interface MarkWebhookProcessingInput {
  bookingId: string;
  gatewayTransactionRef: string;
  supabaseClient?: typeof supabase;
}

export type MarkWebhookProcessingResult =
  | { ok: true; duplicate: false }
  | { ok: false; duplicate: true }
  | { ok: false; duplicate: false };

/**
 * Insert a processed webhook record for idempotency.
 * Returns `duplicate: true` if the reference was already processed.
 */
export async function markWebhookProcessing({
  bookingId,
  gatewayTransactionRef,
  supabaseClient,
}: MarkWebhookProcessingInput): Promise<MarkWebhookProcessingResult> {
  if (!bookingId || !gatewayTransactionRef) {
    return { ok: false, duplicate: false };
  }

  try {
    const db = supabaseClient ?? supabase;
    await db.from("processed_webhooks").insert({
      gateway_transaction_ref: gatewayTransactionRef,
      booking_id: bookingId,
    });
    return { ok: true, duplicate: false };
  } catch (err) {
    if ((err as { code?: string })?.code === "23505") {
      return { ok: false, duplicate: true };
    }
    throw err;
  }
}
