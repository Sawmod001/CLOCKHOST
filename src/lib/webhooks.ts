import crypto from "crypto";
import { supabase } from "@/lib/db/supabase";

const WEBHOOK_SECRET =
  process.env.WEBHOOK_SECRET ?? "clockhost-webhook-default-secret";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebhookDelivery {
  id: string;
  attempt: number;
  max_attempts: number;
  url: string;
  secret?: string | null;
  event_id: string;
}

// ─── Signature ────────────────────────────────────────────────────────────────

export function generateSignature(
  secret: string,
  payload: string | Record<string, unknown>
): string {
  return crypto
    .createHmac("sha256", secret)
    .update(typeof payload === "string" ? payload : JSON.stringify(payload))
    .digest("hex");
}

export function verifySignature(
  secret: string,
  payload: string | Record<string, unknown>,
  signature: string
): boolean {
  const expected = generateSignature(secret, payload);
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex")
  );
}

// ─── Emit ─────────────────────────────────────────────────────────────────────

/** Fire-and-forget: emit a webhook event to all matching endpoints. */
export function emitEvent(
  eventType: string,
  payload: Record<string, unknown> = {},
  source = "system"
): void {
  supabase
    .rpc("emit_webhook_event", {
      p_event_type: eventType,
      p_payload: payload,
      p_source: source,
    })
    .then((res) => {
      if ("error" in res && res.error) {
        console.error("Failed to emit webhook event:", res.error.message);
      }
    })
    .catch(() => {});
}

// ─── Deliver ──────────────────────────────────────────────────────────────────

/** Deliver a single webhook with one retry on failure. */
export async function deliverWebhook(delivery: WebhookDelivery): Promise<void> {
  const { id, attempt, url, secret, event_id } = delivery;

  try {
    const eventRes = await supabase
      .from<{ event_type: string; payload: Record<string, unknown>; source: string }>("webhook_events")
      .select("event_type, payload, source")
      .eq("id", event_id)
      .single();

    const event = eventRes.data;
    if (!event) {
      await supabase.rpc("record_webhook_delivery", {
        p_delivery_id: id,
        p_status: "failed",
        p_error_message: "Event not found",
      });
      return;
    }

    const body = JSON.stringify({
      id: event_id,
      type: event.event_type,
      source: event.source,
      data: event.payload,
      timestamp: new Date().toISOString(),
      attempt,
    });

    const signature = generateSignature(secret ?? WEBHOOK_SECRET, body);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ClockHost-Signature": signature,
        "X-ClockHost-Event": event.event_type,
        "X-ClockHost-Delivery": id,
        "User-Agent": "ClockHost-Webhooks/1.0",
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseBody = await response.text().catch(() => "");

    if (response.ok) {
      await supabase.rpc("record_webhook_delivery", {
        p_delivery_id: id,
        p_status: "success",
        p_response_status: response.status,
        p_response_body: responseBody.substring(0, 1_000),
      });
    } else {
      await supabase.rpc("record_webhook_delivery", {
        p_delivery_id: id,
        p_status: "failed",
        p_response_status: response.status,
        p_response_body: responseBody.substring(0, 1_000),
        p_error_message: `HTTP ${response.status}`,
      });
    }
  } catch (error) {
    await supabase.rpc("record_webhook_delivery", {
      p_delivery_id: id,
      p_status: "failed",
      p_error_message: (error as Error).message,
    });
  }
}

/** Process a batch of pending webhook deliveries. Returns the count processed. */
export async function processPendingDeliveries(batchSize = 10): Promise<number> {
  const res = await supabase
    .rpc("process_webhook_deliveries", { p_batch_size: batchSize })
    .single();
  return (res as unknown as { data?: number }).data ?? 0;
}

// ─── Event type constants ─────────────────────────────────────────────────────

export const EVENT_TYPES = {
  BOOKING_CREATED: "booking.created",
  BOOKING_APPROVED: "booking.approved",
  BOOKING_COMPLETED: "booking.completed",
  BOOKING_CANCELLED: "booking.cancelled",
  BOOKING_REJECTED: "booking.rejected",
  PAYMENT_RECEIVED: "payment.received",
  PAYMENT_RELEASED: "payment.released",
  PAYMENT_REFUNDED: "payment.refunded",
  LISTING_CREATED: "listing.created",
  LISTING_UPDATED: "listing.updated",
  LISTING_SUSPENDED: "listing.suspended",
  DISPUTE_FILED: "dispute.filed",
  DISPUTE_RESOLVED: "dispute.resolved",
  REVIEW_POSTED: "review.posted",
  DOCUMENT_GENERATED: "document.generated",
  MESSAGE_RECEIVED: "message.received",
} as const;

export type WebhookEventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
