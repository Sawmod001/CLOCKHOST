import { supabase } from "@/lib/db/supabase";
import { logAudit } from "@/lib/db/audit";
import type { BookingStatus } from "@/types/db";
import type { DbBooking } from "@/types/db";

// ─── Transition map ───────────────────────────────────────────────────────────

type ActorRole = "host" | "guest" | "admin" | "system";

const VALID_TRANSITIONS: Partial<
  Record<BookingStatus, Partial<Record<BookingStatus, ActorRole[]>>>
> = {
  pending_approval: {
    awaiting_payment: ["host"],
    rejected: ["host"],
    cancelled_system: ["system"],
  },
  awaiting_payment: {
    payment_processing: ["system"],
    cancelled_by_guest: ["guest"],
    cancelled_by_host: ["host"],
    cancelled_system: ["system"],
    expired: ["system"],
  },
  payment_processing: {
    confirmed: ["system"],
    cancelled_system: ["system"],
  },
  confirmed: {
    checked_in: ["guest", "host"],
    completed: ["host"],
    cancelled_by_guest: ["guest"],
    cancelled_by_host: ["host"],
    no_show: ["host", "system"],
  },
  checked_in: {
    completed: ["host"],
  },
  // Viewing bookings
  viewing_pending: {
    viewing_confirmed: ["host"],
    viewing_cancelled: ["host"],
    cancelled_by_guest: ["guest"],
  },
  viewing_confirmed: {
    completed: ["host"],
    no_show: ["host", "system"],
    viewing_cancelled: ["guest", "host"],
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransitionBookingInput {
  bookingId: string;
  toStatus: BookingStatus;
  actorId: string;
  actorRole: ActorRole;
  reason?: string;
}

export type TransitionBookingResult =
  | { ok: true; booking: DbBooking }
  | { ok: false; error: string };

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Transition a booking to a new status.
 * Validates the transition, verifies ownership, and executes an optimistic
 * lock update to prevent concurrent double-transitions (CODE-001).
 */
export async function transitionBooking({
  bookingId,
  toStatus,
  actorId,
  actorRole,
  reason,
}: TransitionBookingInput): Promise<TransitionBookingResult> {
  // 1. Fetch current booking
  const fetchRes = await supabase
    .from<DbBooking>("bookings")
    .select("id, status, listing_id, guest_id, booking_type, slot_id, event_start, event_end")
    .eq("id", bookingId)
    .maybeSingle();

  const booking = fetchRes.data;
  if (!booking) return { ok: false, error: "Booking not found" };

  // 2. Validate transition
  const allowedRoles = VALID_TRANSITIONS[booking.status]?.[toStatus];
  if (!allowedRoles) {
    return {
      ok: false,
      error: `Cannot transition from "${booking.status}" to "${toStatus}"`,
    };
  }
  if (!allowedRoles.includes(actorRole)) {
    return {
      ok: false,
      error: `Role "${actorRole}" cannot perform this transition`,
    };
  }

  // 3. Verify ownership
  if (actorRole === "host") {
    const listingRes = await supabase
      .from("listings")
      .select("provider_profile_id")
      .eq("id", booking.listing_id)
      .maybeSingle();
    if (!listingRes.data) return { ok: false, error: "Listing not found" };

    const profileRes = await supabase
      .from("provider_profiles")
      .select("id, user_id")
      .eq("id", (listingRes.data as Record<string, unknown>)["provider_profile_id"])
      .maybeSingle();

    const profile = profileRes.data as { user_id: string } | null;
    if (!profile || profile.user_id !== actorId) {
      return { ok: false, error: "You do not own this listing" };
    }
  }

  if (actorRole === "guest" && booking.guest_id !== actorId) {
    return { ok: false, error: "You are not the guest for this booking" };
  }

  // 4. Execute transition — optimistic lock on current status
  const updateData: Partial<DbBooking> = {
    status: toStatus,
    updated_at: new Date().toISOString(),
  };
  if (toStatus === "rejected" && reason) {
    (updateData as Record<string, unknown>)["rejection_reason"] = reason;
  }
  if (toStatus.startsWith("cancelled_") && reason) {
    updateData.cancel_reason = reason;
  }

  const updateRes = await supabase
    .from<DbBooking>("bookings")
    .update(updateData as Record<string, unknown>)
    .eq("id", bookingId)
    .eq("status", booking.status)
    .select()
    .maybeSingle();

  if (updateRes.error) {
    return { ok: false, error: updateRes.error.message };
  }
  if (!updateRes.data) {
    return {
      ok: false,
      error: `Booking status changed concurrently (was ${booking.status})`,
    };
  }

  // 5. Side effects for cancellation
  if (
    toStatus.startsWith("cancelled_") ||
    toStatus === "expired" ||
    toStatus === "no_show"
  ) {
    await handleCancellation(booking, actorId);
  }

  // 6. Audit log
  const action =
    toStatus === "awaiting_payment" ? "booking.approved" : `booking.${toStatus}`;
  await logAudit({
    actorId,
    action,
    resourceType: "booking",
    resourceId: bookingId,
    metadata: {
      from_status: booking.status,
      to_status: toStatus,
      booking_type: booking.booking_type,
      reason: reason ?? null,
    },
  });

  return { ok: true, booking: updateRes.data };
}

// ─── Side-effect handlers ─────────────────────────────────────────────────────

async function handleCancellation(
  booking: Pick<DbBooking, "booking_type" | "slot_id" | "listing_id" | "id" | "guest_id">,
  _actorId: string
): Promise<void> {
  // Capacity: release the slot
  if (booking.booking_type === "capacity" && booking.slot_id) {
    await supabase
      .from("slots")
      .update({ status: "open", reserved_by: null, reserved_at: null })
      .eq("id", booking.slot_id)
      .eq("status", "reserved")
      .eq("reserved_by", booking.id);
  }

  // Housing: unblock dates
  if (booking.booking_type === "housing") {
    await supabase
      .from("blocked_dates")
      .delete()
      .eq("listing_id", booking.listing_id)
      .eq("booking_id", booking.id)
      .in("reason", ["booking_held", "booking_confirmed"]);

    await supabase
      .from("tenancy_periods")
      .update({ status: "available", booking_id: null })
      .eq("listing_id", booking.listing_id)
      .eq("booking_id", booking.id);
  }

  // Exclusive: release lock
  if (booking.booking_type === "exclusive") {
    await supabase
      .from("exclusive_locks")
      .update({
        status: "open",
        booking_id: null,
        reserved_by: null,
        reserved_at: null,
      })
      .eq("booking_id", booking.id)
      .eq("status", "reserved");
  }
}
