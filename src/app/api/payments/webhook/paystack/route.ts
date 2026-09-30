import type { NextRequest } from "next/server";
import { supabase } from "@/lib/db/supabase";
import { resolveExclusiveLock } from "@/lib/bookings/exclusive";
import { finalizeGroupPlan } from "@/lib/bookings/group-booking";
import { verifyPaystackSignature } from "@/lib/payments/verifyWebhookSignature";
import { verifyTransaction } from "@/lib/payments/paystack";
import { ok, fail } from "@/lib/db/supabase-utils";

// Refs come in the shape "<prefix>-<uuid>-<rand>"; the uuid contains dashes,
// so split("-")[1] is wrong. Extract the full uuid by trimming the fixed parts.
// Supports both legacy "hostme-" and new "clockhost-" prefixes.
function extractIdFromRef(prefix: string, txRef: string | null | undefined): string | null {
  if (!txRef?.startsWith(prefix + "-")) return null;
  const body = txRef.slice(prefix.length + 1);
  const lastDash = body.lastIndexOf("-");
  if (lastDash === -1) return null;
  const id = body.slice(0, lastDash);
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRe.test(id) ? id : null;
}

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get("x-paystack-signature");
        const secret = process.env.PAYSTACK_SECRET_KEY;

        // Fail closed: never skip signature verification.
        if (!secret) return fail("Webhook not configured", 503);
        if (!verifyPaystackSignature(rawBody, signature as string, secret)) {
            return fail("Invalid signature", 401);
        }

        const payload = JSON.parse(rawBody) as { event?: string; data?: { status?: string; reference?: string; amount?: number | string; id?: number | string } & Record<string, unknown> } & Record<string, unknown>;
        if (payload?.event !== "charge.success") {
            return ok({ received: true, ignored: true });
        }
        if (payload?.data?.status !== "success") {
            return ok({ received: true, ignored: true });
        }

        const txRef = payload?.data?.reference;
        if (!txRef) return fail("Missing transaction reference", 400);

        try {
            await supabase.from("processed_webhooks").insert({
                gateway_transaction_ref: txRef,
                gateway: "paystack",
            });
        } catch (err: unknown) {
            if ((err as { code?: string })?.code === "23505") return ok({ received: true, duplicate: true });
            throw err;
        }

        // Group Booking crowd-pay reference: grpplan-<memberId>-<rand>.
        // Credits that member's share, then finalizes the plan once everyone
        // has paid (atomic, reuses reserve_capacity_slot). Idempotency is
        // already guaranteed by the processed_webhooks insert above.
        if (txRef.startsWith("grpplan-")) {
            const memberId = extractIdFromRef("grpplan", txRef);
            if (!memberId) return fail("Invalid reference format", 400);

            const { data: memberRaw } = await supabase.from("plan_members").select().eq("id", memberId).maybeSingle();
            const member = memberRaw as unknown as { id: string; plan_id: string } | null;
            if (!member) return fail("Plan member not found", 404);

            await supabase.from("plan_members").update({
                status: "paid",
                gateway_transaction_ref: txRef,
            }).eq("id", member.id);

            const result = await finalizeGroupPlan({ planId: member.plan_id as string });
            return ok({ received: true, finalized: result.ok });
        }

        const bookingId = extractIdFromRef("clockhost", txRef) || extractIdFromRef("hostme", txRef);
        if (!bookingId) return fail("Invalid reference format", 400);

        // Server-side verification: confirm with Paystack that the transaction is real
        const verification = await verifyTransaction(txRef);
        if ("error" in verification) {
            console.error("Paystack verification failed:", (verification as { error: string }).error);
            return fail("Transaction verification failed", 402);
        }
        const verified = verification as { status: string };
        if (verified.status !== "success") {
            return ok({ received: true, ignored: true, verification_status: verified.status });
        }

        const { data: bookingRaw } = await supabase.from("bookings").select().eq("id", bookingId).maybeSingle();
        const booking = bookingRaw as unknown as {
          id: string;
          status?: string;
          total_amount_kobo?: number;
          booking_type?: string;
          listing_id?: string;
          event_start?: string;
          guest_id?: string;
        } | null;
        if (!booking) return fail("Booking not found", 404);

        // Only ever confirm a booking that is actually awaiting payment, and
        // only if the paid amount matches the amount we expect.
        if (booking.status !== "awaiting_payment") {
            return ok({ received: true, ignored: true, status: booking.status });
        }
        const paidAmount = payload?.data?.amount;
        if (paidAmount != null && Number(paidAmount) !== Number(booking.total_amount_kobo)) {
            return fail("Amount mismatch", 400);
        }

        if (booking.booking_type === "exclusive") {
            const { data: lockRaw } = await supabase
                .from("exclusive_locks")
                .select()
                .eq("listing_id", booking.listing_id as string)
                .eq("event_start", booking.event_start as string)
                .maybeSingle();

            const lock = lockRaw as unknown as { id: string } | null;
            if (!lock) return fail("Exclusive lock not found", 404);

            const result = await resolveExclusiveLock({
                lockId: lock.id as string,
                bookingId: booking.id as string,
                listingId: booking.listing_id as string,
                eventStart: booking.event_start as string | Date,
            });

            // If we lost the race the booking is already marked lost_race —
            // do not override it with confirmed.
            if (!((result as { won?: boolean }).won)) {
                return ok({ received: true, status: "lost_race" });
            }
        }

        await supabase.from("bookings").update({
            status: "confirmed",
            gateway_transaction_ref: txRef,
            paid_at: new Date().toISOString(),
        }).eq("id", booking.id);

        // Update or create payment record
        const { data: existingPayment } = await supabase
            .from("payment_records")
            .select("id")
            .eq("booking_id", booking.id)
            .eq("gateway_transaction_ref", txRef)
            .maybeSingle();

        if (existingPayment) {
            await supabase.from("payment_records").update({
                status: "successful",
                gateway_event_id: payload?.data?.id?.toString(),
                updated_at: new Date().toISOString(),
            }).eq("id", existingPayment.id);
        } else {
            await supabase.from("payment_records").insert({
                booking_id: booking.id,
                amount_kobo: booking.total_amount_kobo,
                currency: "NGN",
                gateway: "paystack",
                gateway_transaction_ref: txRef,
                gateway_event_id: payload?.data?.id?.toString(),
                status: "successful",
                metadata: {
                    paid_amount: paidAmount,
                    webhook_event: payload?.event,
                },
            });
        }

        // Send confirmation notification to guest
        await supabase.from("notifications").insert({
            user_id: booking.guest_id,
            type: "payment_confirmed",
            title: "Payment Confirmed",
            body: `Your payment of ₦${((booking.total_amount_kobo as number) / 100).toFixed(2)} has been confirmed.`,
            link: `/bookings/${booking.id}`,
            metadata: { booking_id: booking.id, reference: txRef },
        });

        return ok({ received: true });
    } catch (error) {
        console.error("POST /api/payments/webhook/paystack error:", error);
        return fail("Internal error", 500);
    }
}