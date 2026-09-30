import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * PATCH /api/viewings/[id]
 * Update viewing status (confirm, complete, cancel, no_show).
 *
 * Body:
 *   { status, hostNote? }
 *
 * Rules:
 * - Host can: confirm, complete, cancel, mark no_show
 * - Guest can: cancel
 * - Status transitions: pending→confirmed, pending→cancelled,
 *   confirmed→completed, confirmed→cancelled, confirmed→no_show
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { id } = await context.params;
    const body = (await request.json() as Record<string, unknown>);
    const { status, hostNote } = body;
    const statusStr = status as string | undefined;

    const validStatuses = ["confirmed", "completed", "cancelled", "no_show"];
    if (!statusStr || !validStatuses.includes(statusStr as string)) {
      return NextResponse.json({ error: `status must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    // Fetch the viewing
    const { data: viewingRaw } = await supabase
      .from("viewings")
      .select("id, listing_id, guest_id, host_id, status, scheduled_at, duration_minutes")
      .eq("id", id)
      .maybeSingle();

    const viewing = viewingRaw as unknown as {
      listing_id?: string;
      guest_id?: string;
      host_id?: string;
      status?: string;
    } | null;

    if (!viewing) {
      return NextResponse.json({ error: "Viewing not found" }, { status: 404 });
    }

    const isHost = viewing.host_id === user.id;
    const isGuest = viewing.guest_id === user.id;

    if (!isHost && !isGuest) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["completed", "cancelled", "no_show"],
    };

    const allowed = validTransitions[viewing.status as string] || [];
    if (!allowed.includes(statusStr as string)) {
      return NextResponse.json({
        error: `Cannot transition from "${viewing.status as string}" to "${statusStr as string}"`,
      }, { status: 400 });
    }

    // Guest can only cancel
    if (isGuest && statusStr !== "cancelled") {
      return NextResponse.json({ error: "Guests can only cancel viewings" }, { status: 403 });
    }

    // Host can confirm, complete, cancel, no_show
    if (isHost && ["confirmed", "completed", "cancelled", "no_show"].includes(statusStr as string)) {
      // ok
    }

    // Update viewing
    const updateData: Record<string, unknown> = { status: statusStr };
    if (hostNote && isHost) updateData.host_note = hostNote as string;

    const { error: updateError } = await supabase
      .from("viewings")
      .update(updateData)
      .eq("id", id);

    if (updateError) throw updateError;

    // Send notification to the other party
    const notifyUserId = isHost ? viewing.guest_id : viewing.host_id;
    const actorName = ((user as unknown as Record<string, unknown>).full_name as string) || "Someone";
    const listingRes = await supabase
      .from("listings")
      .select("title")
      .eq("id", viewing.listing_id as string)
      .maybeSingle();

    const listingTitle = ((listingRes as unknown as { data: { title?: string } | null }).data?.title as string) || "a listing";
    let notifType: string | undefined, notifTitle: string | undefined, notifBody: string | undefined;

    switch (statusStr) {
      case "confirmed":
        notifType = "viewing_confirmed";
        notifTitle = "Viewing Confirmed";
        notifBody = `${actorName} confirmed the viewing for "${listingTitle}".`;
        break;
      case "completed":
        notifType = "viewing_completed";
        notifTitle = "Viewing Completed";
        notifBody = `The viewing for "${listingTitle}" has been marked as completed.`;
        break;
      case "cancelled":
        notifType = "viewing_cancelled";
        notifTitle = "Viewing Cancelled";
        notifBody = `${actorName} cancelled the viewing for "${listingTitle}".`;
        break;
      case "no_show":
        notifType = "viewing_no_show";
        notifTitle = "Viewing No-Show";
        notifBody = `The guest did not show up for the viewing at "${listingTitle}".`;
        break;
    }

    if (notifType) {
      await supabase.from("notifications").insert({
        user_id: notifyUserId,
        type: notifType,
        title: notifTitle,
        body: notifBody,
        link: isHost ? "/host/bookings" : "/dashboard",
        metadata: { viewing_id: id, listing_id: viewing.listing_id },
      });
    }

    await logAudit({
      actorId: user.id,
      action: `viewing.${statusStr as string}`,
      resourceType: "viewing",
      resourceId: id,
      metadata: { from_status: viewing.status, to_status: statusStr, host_note: hostNote },
    });

    return NextResponse.json({ ok: true, data: { id, status: statusStr } });
  } catch (error) {
    console.error("PATCH /api/viewings/[id] error:", error);
    return NextResponse.json({ error: "Failed to update viewing" }, { status: 500 });
  }
}
