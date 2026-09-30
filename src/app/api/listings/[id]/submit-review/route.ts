import type { NextRequest } from "next/server";
import { parseSessionToken, verifyClerkSession } from "@/lib/auth/getSessionUser";
import { getUser } from "@/lib/auth/getUser";
import { findListingById, updateListing } from "@/lib/db/supabase-queries";
import { validateCsrfOrigin } from "@/lib/csrf";
import { logAudit } from "@/lib/db/audit";
import { toCamelCase, ok, fail, notFound, forbidden, parseId } from "@/lib/db/supabase-utils";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const csrfFail = validateCsrfOrigin(request);
        if (csrfFail) return csrfFail;

        const p = await context.params;
        const sessionInfo = await parseSessionToken(request);
        if (!sessionInfo?.userId) return fail("Unauthorized", 401);
        const isValid = await verifyClerkSession(sessionInfo.sessionId, sessionInfo.userId);
        if (!isValid) return fail("Unauthorized", 401);

        const user = await getUser(sessionInfo.userId);
        if (!user) return fail("User not found", 404);

        if (!parseId(p.id)) return fail("Invalid listing ID", 400);

        const listing = await findListingById(p.id);
        if (!listing) return notFound("Listing not found");

        const isOwner = user.providerProfile?.id === listing.provider_profile_id;
        if (!isOwner) return forbidden();

        if (listing.status !== "draft") return fail("Listing is not in draft status", 400);

        const updated = await updateListing(p.id, { status: "submitted" });

        await logAudit({
            actorId: user.id,
            action: "listing.submitted_for_review",
            resourceType: "listing",
            resourceId: p.id,
            metadata: { title: listing.title },
        });

        return ok(toCamelCase(updated));
    } catch (error) {
        console.error("POST /api/listings/[id]/submit-review error:", error);
        return fail("Failed to submit for review", 500);
    }
}
