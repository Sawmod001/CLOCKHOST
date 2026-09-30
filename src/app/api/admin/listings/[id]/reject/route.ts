import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/helpers";
import { findListingById, updateListing, findUserByClerkId } from "@/lib/db/supabase-queries";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { z } from "zod";
import { toCamelCase, ok, fail, notFound, parseId } from "@/lib/db/supabase-utils";

const RejectSchema = z.object({
  reason: z.string().min(5).max(500),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const { id } = await context.params;

    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    if (!parseId(id)) return fail("Invalid listing ID", 400);

    const payload: unknown = await request.json();
    const validation = RejectSchema.safeParse(payload);
    if (!validation.success) {
      return ok({ error: "Invalid payload", issues: validation.error.issues }, 400);
    }

    const listing = await findListingById(id);
    if (!listing) return notFound("Listing not found");
    if (!["submitted", "under_review"].includes(listing.status)) return fail("Listing is not submitted for review", 400);

    const updated = await updateListing(id, {
      status: "rejected",
      rejection_reason: validation.data.reason,
    } as unknown as Parameters<typeof updateListing>[1]);
    if (!updated) return fail("Failed to reject listing — update returned empty", 500);

    const adminUser = await findUserByClerkId(user.clerkId as string);
    await logAudit({
      actorId: adminUser?.id || null,
      action: "listing.rejected",
      resourceType: "listing",
      resourceId: id,
      metadata: { previousStatus: listing.status, reason: validation.data.reason, listingTitle: listing.title },
    });

    return ok(toCamelCase(updated));
  } catch (error) {
    console.error("POST /api/admin/listings/[id]/reject error:", error);
    return fail("Failed to reject listing", 500);
  }
}
