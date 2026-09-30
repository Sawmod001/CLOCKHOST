import type { NextRequest } from "next/server";
import { parseSessionToken, verifyClerkSession } from "@/lib/auth/getSessionUser";
import { getUser } from "@/lib/auth/getUser";
import { findSlotById, findListingById } from "@/lib/db/supabase-queries";
import { supabase } from "@/lib/db/supabase";
import { ok, fail, notFound, unauthorised, forbidden, parseId } from "@/lib/db/supabase-utils";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; slotId: string }> }) {
  try {
    const p = await context.params;
    const sessionInfo = await parseSessionToken(request);
    if (!sessionInfo?.userId) return unauthorised("No session");
    const isValid = await verifyClerkSession(sessionInfo.sessionId, sessionInfo.userId);
    if (!isValid) return unauthorised("Invalid session");

    const user = await getUser(sessionInfo.userId);
    if (!user) return unauthorised("User not found");

    if (!parseId(p.id) || !parseId(p.slotId)) return fail("Invalid ID", 400);

    const listing = await findListingById(p.id);
    if (!listing) return notFound("Listing not found");

    const isOwner = user.providerProfile?.id === listing.provider_profile_id;
    const isAdmin = user.role === "admin";
    if (!isOwner && !isAdmin) return forbidden("Not your listing");

    const slot = await findSlotById(p.slotId);
    if (!slot) return notFound("Slot not found");
    if (slot.listing_id !== p.id) return fail("Slot does not belong to this listing", 400);
    if (slot.booked > 0) return fail("Cannot delete a slot with active bookings", 400);

    const { error } = await supabase.from("slots").delete().eq("id", p.slotId);
    if (error) throw error;

    return ok({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/listings/slots/[slotId] error:", error);
    return fail("Failed to delete slot", 500);
  }
}
