import type { NextRequest } from "next/server";
import { supabase } from "@/lib/db/supabase";
import { finalizeGroupPlan } from "@/lib/bookings/group-booking";
import { parseSessionToken, verifyClerkSession } from "@/lib/auth/getSessionUser";
import { getUser } from "@/lib/auth/getUser";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";
import { ok, fail, unauthorised, forbidden, notFound, parseId } from "@/lib/db/supabase-utils";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        if (!rateLimitOk(`finalize:${clientIp(request)}`, 20)) {
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

        const { data: plan } = await supabase.from("group_plans").select().eq("id", p.id).maybeSingle();
        if (!plan) return notFound("Plan not found");

        // Only the plan creator can finalize. Members' payments already trigger
        // finalization inside the payment route, so this surface is for the
        // creator to confirm once everyone has paid.
        if (plan.created_by !== user.id) {
            return forbidden("Only the plan creator can finalize");
        }

        const result = await finalizeGroupPlan({ planId: p.id });

        if (!result.ok) return fail(result.error, result.status);
        return ok({ ok: true, data: result.data });
    } catch (error) {
        console.error("POST /api/group-plans/[id]/finalize error:", error);
        return fail("Failed to finalize plan", 500);
    }
}