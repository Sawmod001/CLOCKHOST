import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * POST /api/settings/delete-account
 * Request account deletion.
 *
 * Body:
 *   { reason? }
 *
 * Rules:
 * - Cannot delete if there are active bookings
 * - Creates a deletion request for admin review
 * - 30-day cooling period before actual deletion
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json().catch(() => ({})) as Record<string, unknown>);
    const { reason } = body;

    // Check for active bookings
    const { data: activeBookingsRaw } = await supabase
      .from("bookings")
      .select("id")
      .eq("guest_id", user.id)
      .in("status", ["confirmed", "awaiting_payment"]);

    const activeBookings = activeBookingsRaw as unknown as Array<{ id: string }> | null;
    if (activeBookings && activeBookings.length > 0) {
      return fail("Cannot delete account with active bookings. Please cancel or complete them first.", 409);
    }

    // Check for existing pending request
    const { data: existingRequest } = await supabase
      .from("account_deletion_requests")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingRequest) {
      return fail("You already have a pending deletion request", 409);
    }

    // Create deletion request
    const { data: deletionRequestRaw, error } = await supabase
      .from("account_deletion_requests")
      .insert({
        user_id: user.id,
        reason: (reason as string) || null,
        status: "pending",
      })
      .select()
      .single();

    const deletionRequest = deletionRequestRaw as unknown as { id: string } | null;

    if (error) throw error;

    // Notify admin
    const adminUsersRes = await supabase.from("users").select("id").eq("role", "admin").limit(1);
    const adminUsers = (adminUsersRes as unknown as { data: Array<{ id: string }> | null }).data;
    await supabase.from("notifications").insert({
      user_id: adminUsers?.[0]?.id,
      type: "account_deletion_requested",
      title: "Account Deletion Request",
      body: `User ${(user as unknown as Record<string, unknown>).full_name as string || user.email} has requested account deletion.`,
      link: "/admin/users",
      metadata: { request_id: deletionRequest?.id, user_id: user.id },
    });

    await logAudit({
      actorId: user.id,
      action: "account.deletion_requested",
      resourceType: "user",
      resourceId: user.id,
      metadata: { request_id: deletionRequest?.id, reason: (reason as string) || null },
    });

    return ok({
      ok: true,
      data: {
        requestId: deletionRequest?.id,
        message: "Your account deletion request has been submitted. It will be reviewed within 30 days.",
      },
    });
  } catch (error) {
    console.error("POST /api/settings/delete-account error:", error);
    return fail("Failed to request account deletion", 500);
  }
}
