import type { NextRequest } from "next/server";
import { getPlan } from "@/lib/bookings/group-booking";
import { parseSessionToken, verifyClerkSession } from "@/lib/auth/getSessionUser";
import { getUser } from "@/lib/auth/getUser";
import { ok, fail, notFound, parseId } from "@/lib/db/supabase-utils";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const p = await context.params;
        if (!parseId(p.id)) return fail("Invalid plan ID", 400);

        // Public view for invite links. Resolves the caller's account so they
        // can see their own membership; unauthenticated viewers get the plan
        // without a membership.
        let userId: string | undefined = undefined;
        const sessionInfo = await parseSessionToken(request);
        if (sessionInfo?.userId) {
            const isValid = await verifyClerkSession(sessionInfo.sessionId, sessionInfo.userId);
            if (isValid) {
                const user = await getUser(sessionInfo.userId);
                if (user) userId = user.id;
            }
        }

        const plan = await getPlan({ planId: p.id, userId });
        if (!plan) return notFound("Plan not found");

        return ok({ data: plan });
    } catch (error) {
        console.error("GET /api/group-plans/[id] error:", error);
        return fail("Failed to load plan", 500);
    }
}