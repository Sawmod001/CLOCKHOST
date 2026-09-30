import type { NextRequest } from "next/server";
import crypto from "crypto";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail, notFound, forbidden } from "@/lib/db/supabase-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/db/audit";
import { initializeTransaction } from "@/lib/payments/paystack";

export async function POST(request: NextRequest) {
    try {
        const userOrResponse = await requireAuthenticatedUser(request);
        if (userOrResponse instanceof Response) return userOrResponse;
        const user = userOrResponse;

        const rateLimited = checkRateLimit(request, { windowMs: 60_000, max: 5 }, "initiate-payment");
        if (rateLimited) return rateLimited;

        const payload = (await request.json() as Record<string, unknown>);
        const bookingId = payload?.bookingId;
        if (!bookingId) return fail("Booking ID is required", 400);

        const { data: bookingRaw } = await supabase.from("bookings").select().eq("id", bookingId as string).maybeSingle();
        const booking = bookingRaw as unknown as {
          id: string;
          guest_id?: string;
          status?: string;
          expires_at?: string | null;
          total_amount_kobo?: number;
          listing_id?: string;
          booking_type?: string;
        } | null;
        if (!booking) return notFound("Booking not found");
        if (booking.guest_id !== user.id) return forbidden();
        if (booking.status !== "awaiting_payment") return fail("Booking is not awaiting payment", 400);

        // Check if booking has expired
        if (booking.expires_at && new Date(booking.expires_at as string) < new Date()) {
            await supabase.from("bookings").update({
                status: "expired",
                cancel_reason: "Payment deadline expired",
                cancelled_at: new Date().toISOString(),
            }).eq("id", bookingId as string);
            return fail("Booking has expired", 410);
        }

        // Check for existing successful payment
        const { data: existingPayment } = await supabase
            .from("payment_records")
            .select("id")
            .eq("booking_id", bookingId)
            .eq("status", "successful")
            .maybeSingle();

        if (existingPayment) return fail("Payment already completed", 409);

        const reference = `clockhost-${booking.id}-${crypto.randomUUID().slice(0, 8)}`;
        const baseUrl = process.env.CLOCKHOST_BASE_URL || process.env.HOSTME_BASE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
        if (!baseUrl) {
          console.warn("CLOCKHOST_BASE_URL not set, callback URL may be incorrect");
        }
        const callbackUrl = `${baseUrl || "http://localhost:3000"}/bookings/${booking.id}/pay/confirm`;

        // Initialize Paystack transaction
        const paystackResult = await initializeTransaction({
            amountKobo: booking.total_amount_kobo as number,
            email: user.email,
            reference,
            callbackUrl,
            metadata: {
                booking_id: booking.id,
                guest_id: user.id,
                listing_id: booking.listing_id,
                booking_type: booking.booking_type,
            },
        });

        if ("error" in paystackResult) {
            return fail((paystackResult as { error: string }).error, 502);
        }

        const paystackOk = paystackResult as { authorizationUrl: string; accessCode: string; mock?: boolean };

        // Write payment record
        const { error: paymentError } = await supabase
            .from("payment_records")
            .insert({
                booking_id: booking.id,
                amount_kobo: booking.total_amount_kobo,
                currency: "NGN",
                gateway: paystackOk.mock ? "mock" : "paystack",
                gateway_transaction_ref: reference,
                status: "pending",
                metadata: {
                    paystack_access_code: paystackOk.accessCode,
                    callback_url: callbackUrl,
                    is_mock: paystackOk.mock || false,
                },
            });

        if (paymentError) console.error("Payment record insert error:", paymentError);

        await logAudit({
            actorId: user.id,
            action: "payment.initiated",
            resourceType: "booking",
            resourceId: booking.id as string,
            metadata: {
                reference,
                amount_kobo: booking.total_amount_kobo,
                gateway: paystackOk.mock ? "mock" : "paystack",
            },
        });

        return ok({
            ok: true,
            data: {
                bookingId: booking.id,
                reference,
                authorization_url: paystackOk.authorizationUrl,
                accessCode: paystackOk.accessCode,
                amountKobo: booking.total_amount_kobo,
                mock: paystackOk.mock || false,
            },
        });
    } catch (error) {
        console.error("POST /api/payments/initiate error:", error);
        return fail("Failed to initiate payment", 500);
    }
}