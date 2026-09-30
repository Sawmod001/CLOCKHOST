import type { NextRequest } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/db/supabase";
import { finalizeGroupPlan } from "@/lib/bookings/group-booking";
import { parseSessionToken, verifyClerkSession } from "@/lib/auth/getSessionUser";
import { getUser } from "@/lib/auth/getUser";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";
import { ok, fail, unauthorised, notFound, forbidden, parseId } from "@/lib/db/supabase-utils";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        if (process.env.NODE_ENV === "production") {
            return fail("Payments are not available yet in production", 503);
        }

        if (!rateLimitOk(`pay:${clientIp(request)}`, 30)) {
            return fail("Too many attempts. Try again later.", 429);
        }

        const sessionInfo = await parseSessionToken(request);
        if (!sessionInfo?.userId) return unauthorised();
        const isValid = await verifyClerkSession(sessionInfo.sessionId, sessionInfo.userId);
        if (!isValid) return unauthorised();

        const user = await getUser(sessionInfo.userId);
        if (!user) return fail("User not found", 404);

        const p = await context.params;
        if (!parseId(p.id)) return fail("Invalid plan ID", 400);

        const body = (await request.json() as Record<string, unknown>);
        const memberId = body.memberId || null;

        const query = supabase.from("plan_members").select().eq("plan_id", p.id);
        const { data: membersRaw } = memberId
            ? await query.eq("id", memberId as string)
            : await query.eq("user_id", user.id);

        const members = membersRaw as unknown as Array<{
          id: string;
          user_id?: string;
          status?: string;
          share_amount_kobo?: number;
        }> | null;
        const member = (members || [])[0] as
          | { id: string; user_id?: string; status?: string; share_amount_kobo?: number }
          | undefined;
        if (!member) return notFound("You have not joined this plan");
        if (member.user_id !== user.id) return forbidden();

        const { data: planRaw } = await supabase.from("group_plans").select().eq("id", p.id).maybeSingle();
        const plan = planRaw as unknown as { status?: string } | null;
        if (!plan) return notFound("Plan not found");

        if (member.status === "paid" || member.status === "confirmed") {
            return ok({ ok: true, data: { memberId: member.id, alreadyPaid: true, finalized: false } });
        }
        if (plan.status !== "active") return fail(`Plan is already ${plan.status}`, 409);

        const txRef = `grpplan-${member.id}-${crypto.randomUUID().slice(0, 8)}`;

        try {
            await supabase.from("processed_webhooks").insert({
                gateway_transaction_ref: txRef,
                gateway: "mock",
            });
        } catch (err) {
            if ((err as { code?: string })?.code === "23505") return ok({ ok: true, data: { memberId: member.id, duplicate: true } });
            throw err;
        }

        await supabase.from("plan_members").update({
            status: "paid",
            gateway_transaction_ref: txRef,
        }).eq("id", member.id);

        const finalized = await finalizeGroupPlan({ planId: p.id });

        return ok({
            ok: true,
            data: {
                memberId: member.id,
                amountKobo: member.share_amount_kobo,
                paid: true,
                finalized: finalized.ok,
                bookingId: finalized.ok ? finalized.data.bookingId : null,
                message: finalized.ok
                    ? "Plan confirmed!"
                    : finalized.status === 400
                        ? "Your share is paid. Waiting for the rest of the group."
                        : `Your share is paid. ${finalized.error || "Plan could not be finalized yet."}`,
            },
        });
    } catch (error) {
        console.error("POST /api/group-plans/[id]/payments/mock-confirm error:", error);
        return fail("Failed to confirm plan payment", 500);
    }
}