import { supabase } from "@/lib/db/supabase";
import type { NotificationChannel } from "@/types/db";

// ─── Core send ────────────────────────────────────────────────────────────────

export interface SendNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, unknown>;
  channel?: NotificationChannel;
}

export interface SendNotificationResult {
  ok: boolean;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

/**
 * Send a single in-app (or email/push) notification.
 * Respects user notification preferences and quiet hours.
 */
export async function sendNotification({
  userId,
  type,
  title,
  body,
  link,
  metadata,
  channel = "in_app",
}: SendNotificationInput): Promise<SendNotificationResult> {
  if (!userId || !type || !title || !body) {
    console.error("[Notification] Missing required fields:", { userId, type, title });
    return { ok: false, error: "Missing required notification fields" };
  }

  // Respect user notification preferences
  try {
    const prefsRes = await supabase
      .from<Record<string, unknown>>("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const prefs = prefsRes.data;
    if (prefs) {
      const channelEnabled =
        (prefs[`${channel}_enabled`] as boolean | undefined) ??
        (prefs[channel] as boolean | undefined) ??
        true;
      const typeEnabled =
        (prefs[type] as boolean | undefined) ??
        (prefs[`type_${type}`] as boolean | undefined) ??
        true;

      if (channelEnabled === false || typeEnabled === false) {
        return { ok: true, skipped: true, reason: "Preference disabled" };
      }

      // Quiet hours
      const quietStart = prefs["quiet_hours_start"] as string | undefined;
      const quietEnd = prefs["quiet_hours_end"] as string | undefined;
      if (quietStart && quietEnd) {
        const hour = new Date().getHours();
        const start = parseInt(quietStart.split(":")[0] ?? "0", 10);
        const end = parseInt(quietEnd.split(":")[0] ?? "0", 10);
        const inQuiet =
          start <= end ? hour >= start && hour < end : hour >= start || hour < end;
        const isUrgent =
          type === "booking_cancelled" || type === "payment_confirmed";
        if (inQuiet && !isUrgent) {
          return { ok: true, skipped: true, reason: "Quiet hours" };
        }
      }
    }
  } catch {
    // Non-fatal — continue without preference check
  }

  try {
    const insertRes = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body,
      link: link ?? null,
      metadata: metadata ?? {},
      channel,
      is_read: false,
      created_at: new Date().toISOString(),
    });
    if ("error" in insertRes && insertRes.error) {
      console.error("[Notification] Insert error:", insertRes.error);
      return { ok: false, error: insertRes.error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[Notification] Unexpected error:", err);
    return { ok: false, error: "Failed to send notification" };
  }
}

// ─── Bulk send ────────────────────────────────────────────────────────────────

export interface SendBulkNotificationsInput extends Omit<SendNotificationInput, "userId"> {
  userIds: string[];
}

export async function sendBulkNotifications({
  userIds,
  type,
  title,
  body,
  link,
  metadata,
  channel = "in_app",
}: SendBulkNotificationsInput): Promise<{ ok: boolean; count?: number; error?: string }> {
  if (!userIds?.length) return { ok: true, count: 0 };

  const records = userIds.map((userId) => ({
    user_id: userId,
    type,
    title,
    body,
    link: link ?? null,
    metadata: metadata ?? {},
    channel,
    is_read: false,
    created_at: new Date().toISOString(),
  }));

  try {
    const insertRes = await supabase.from("notifications").insert(records as unknown as Record<string, unknown>);
    if ("error" in insertRes && insertRes.error) {
      console.error("[Notification] Bulk insert error:", insertRes.error);
      return { ok: false, error: insertRes.error.message };
    }
    return { ok: true, count: records.length };
  } catch (err) {
    console.error("[Notification] Bulk unexpected error:", err);
    return { ok: false, error: "Failed to send bulk notifications" };
  }
}

// ─── Notification type constants ──────────────────────────────────────────────

export const NOTIFICATION_TYPES = {
  BOOKING_CREATED: "booking_created",
  BOOKING_APPROVED: "booking_approved",
  BOOKING_REJECTED: "booking_rejected",
  BOOKING_CANCELLED: "booking_cancelled",
  BOOKING_COMPLETED: "booking_completed",
  PAYMENT_INITIATED: "payment_initiated",
  PAYMENT_CONFIRMED: "payment_confirmed",
  PAYMENT_FAILED: "payment_failed",
  REVIEW_RECEIVED: "review_received",
  REVIEW_RESPONDED: "review_responded",
  LISTING_APPROVED: "listing_approved",
  LISTING_REJECTED: "listing_rejected",
  LISTING_SUSPENDED: "listing_suspended",
  VERIFICATION_APPROVED: "verification_approved",
  VERIFICATION_REJECTED: "verification_rejected",
  DISPUTE_OPENED: "dispute_opened",
  DISPUTE_RESOLVED: "dispute_resolved",
  VIEWING_CONFIRMED: "viewing_confirmed",
  VIEWING_CANCELLED: "viewing_cancelled",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

// ─── Template helpers ─────────────────────────────────────────────────────────

export async function notifyBookingCreated({
  hostId,
  guestName,
  listingTitle,
  bookingId,
}: {
  hostId: string;
  guestName: string;
  listingTitle: string;
  bookingId: string;
}): Promise<SendNotificationResult> {
  return sendNotification({
    userId: hostId,
    type: NOTIFICATION_TYPES.BOOKING_CREATED,
    title: "New Booking Request",
    body: `${guestName} requested to book "${listingTitle}"`,
    link: `/host/bookings/${bookingId}`,
    metadata: { booking_id: bookingId },
  });
}

export async function notifyBookingDecision({
  guestId,
  listingTitle,
  bookingId,
  decision,
}: {
  guestId: string;
  listingTitle: string;
  bookingId: string;
  decision: "approved" | "rejected";
}): Promise<SendNotificationResult> {
  const isApproved = decision === "approved";
  return sendNotification({
    userId: guestId,
    type: isApproved ? NOTIFICATION_TYPES.BOOKING_APPROVED : NOTIFICATION_TYPES.BOOKING_REJECTED,
    title: isApproved ? "Booking Approved" : "Booking Rejected",
    body: isApproved
      ? `Your booking for "${listingTitle}" has been approved. Please complete payment.`
      : `Your booking for "${listingTitle}" was not approved.`,
    link: `/bookings/${bookingId}`,
    metadata: { booking_id: bookingId, decision },
  });
}

export async function notifyBookingCancelled({
  recipientId,
  actorName,
  listingTitle,
  bookingId,
  reason,
}: {
  recipientId: string;
  actorName: string;
  listingTitle: string;
  bookingId: string;
  reason?: string;
}): Promise<SendNotificationResult> {
  return sendNotification({
    userId: recipientId,
    type: NOTIFICATION_TYPES.BOOKING_CANCELLED,
    title: "Booking Cancelled",
    body: `${actorName} cancelled the booking for "${listingTitle}".${reason ? ` Reason: ${reason}` : ""}`,
    link: `/bookings/${bookingId}`,
    metadata: { booking_id: bookingId, reason },
  });
}

export async function notifyPaymentConfirmed({
  guestId,
  amountKobo,
  bookingId,
}: {
  guestId: string;
  amountKobo: number;
  bookingId: string;
}): Promise<SendNotificationResult> {
  return sendNotification({
    userId: guestId,
    type: NOTIFICATION_TYPES.PAYMENT_CONFIRMED,
    title: "Payment Confirmed",
    body: `Your payment of ₦${(amountKobo / 100).toFixed(2)} has been confirmed.`,
    link: `/bookings/${bookingId}`,
    metadata: { booking_id: bookingId, amount_kobo: amountKobo },
  });
}

export async function notifyReviewReceived({
  hostId,
  guestName,
  listingTitle,
  reviewId,
}: {
  hostId: string;
  guestName: string;
  listingTitle: string;
  reviewId: string;
}): Promise<SendNotificationResult> {
  return sendNotification({
    userId: hostId,
    type: NOTIFICATION_TYPES.REVIEW_RECEIVED,
    title: "New Review",
    body: `${guestName} left a review for "${listingTitle}"`,
    link: `/reviews/${reviewId}`,
    metadata: { review_id: reviewId },
  });
}

export async function notifyListingDecision({
  hostId,
  listingTitle,
  listingId,
  decision,
}: {
  hostId: string;
  listingTitle: string;
  listingId: string;
  decision: "approved" | "rejected";
}): Promise<SendNotificationResult> {
  const isApproved = decision === "approved";
  return sendNotification({
    userId: hostId,
    type: isApproved ? NOTIFICATION_TYPES.LISTING_APPROVED : NOTIFICATION_TYPES.LISTING_REJECTED,
    title: isApproved ? "Listing Approved" : "Listing Rejected",
    body: isApproved
      ? `Your listing "${listingTitle}" is now live.`
      : `Your listing "${listingTitle}" was not approved. Please review and resubmit.`,
    link: `/host/listings/${listingId}`,
    metadata: { listing_id: listingId, decision },
  });
}

export async function notifyViewingConfirmed({
  guestId,
  listingTitle,
  viewingDate,
  viewingId,
}: {
  guestId: string;
  listingTitle: string;
  viewingDate: string;
  viewingId: string;
}): Promise<SendNotificationResult> {
  return sendNotification({
    userId: guestId,
    type: NOTIFICATION_TYPES.VIEWING_CONFIRMED,
    title: "Viewing Confirmed",
    body: `Your viewing for "${listingTitle}" on ${viewingDate} has been confirmed.`,
    link: `/viewings/${viewingId}`,
    metadata: { viewing_id: viewingId },
  });
}
