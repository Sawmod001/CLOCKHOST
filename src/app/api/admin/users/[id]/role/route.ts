import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail, parseId } from "@/lib/db/supabase-utils";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * PATCH /api/admin/users/[id]/role
 * Change a user's role.
 *
 * Body:
 *   { role, reason? }
 *
 * Valid roles: guest, venue_host, shortlet_host, admin
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof Response) return adminOrResponse;
    const admin = adminOrResponse;

    const { id } = await context.params;
    if (!parseId(id)) return fail("Invalid user ID", 400);

    const body = (await request.json()) as { role?: unknown; reason?: unknown };
    const { role, reason } = body;

    if (!role) return fail("role required", 400);

    const validRoles = ["guest", "venue_host", "shortlet_host", "admin"];
    if (!validRoles.includes(role as string)) {
      return fail(`role must be one of: ${validRoles.join(", ")}`, 400);
    }

    // Use database function for atomic role change
    const { data: result } = await supabase
      .rpc("admin_change_user_role", {
        p_user_id: id,
        p_new_role: role as string,
        p_admin_id: admin.id,
        p_reason: (reason as string | null) || null,
      })
      .single();

    const typedResult = result as { ok?: unknown; error?: unknown; old_role?: unknown; new_role?: unknown } | null;
    if (!typedResult?.ok) {
      return fail((typedResult?.error as string) || "Failed to change role", 400);
    }

    await logAudit({
      actorId: admin.id,
      action: "role.changed",
      resourceType: "user",
      resourceId: id,
      metadata: {
        old_role: typedResult.old_role,
        new_role: typedResult.new_role,
        reason: (reason as string | null) || null,
      },
    });

    return ok({
      ok: true,
      data: {
        userId: id,
        oldRole: typedResult.old_role,
        newRole: typedResult.new_role,
      },
    });
  } catch (error) {
    console.error("PATCH /api/admin/users/[id]/role error:", error);
    return fail("Failed to change user role", 500);
  }
}
