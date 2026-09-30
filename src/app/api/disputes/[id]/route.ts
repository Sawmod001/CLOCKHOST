import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * GET /api/disputes/[id]
 * Get dispute details with evidence.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { id } = await context.params;

    const { data: dispute } = await supabase
      .from("disputes")
      .select(`
        id, dispute_type, description, status, resolution,
        guest_response, host_response, admin_notes,
        created_at, resolved_at,
        booking:booking_id(id, event_start, event_end, total_amount_kobo, status,
          listing:listing_id(id, title, vertical, location)),
        filed_by_user:filed_by(id, full_name, email),
        against_user:against_user_id(id, full_name, email),
        resolved_by_user:resolved_by(id, full_name)
      `)
      .eq("id", id)
      .maybeSingle();

    if (!dispute) return fail("Dispute not found", 404);

    // Verify access
    const isAdmin = user.role === "admin";
    const isFilier = (dispute.filed_by_user as { id?: string } | null)?.id === user.id;
    const isAgainst = (dispute.against_user as { id?: string } | null)?.id === user.id;

    if (!isAdmin && !isFilier && !isAgainst) {
      return fail("Not authorized", 403);
    }

    // Fetch evidence
    const { data: evidence } = await supabase
      .from("dispute_evidence")
      .select("id, evidence_type, file_url, description, created_at, submitted_by(id, full_name)")
      .eq("dispute_id", id)
      .order("created_at", { ascending: true });

    return ok({
      ok: true,
      data: {
        ...dispute,
        evidence: evidence || [],
        yourRole: isAdmin ? "admin" : isFilier ? "filer" : "against",
      },
    });
  } catch (error) {
    console.error("GET /api/disputes/[id] error:", error);
    return fail("Failed to fetch dispute", 500);
  }
}

interface UpdateDisputePayload {
  response?: unknown;
  resolution?: unknown;
  action?: unknown;
  adminNotes?: unknown;
}

/**
 * PATCH /api/disputes/[id]
 * Respond to a dispute (guest or host) or resolve (admin).
 *
 * Body:
 *   { response?: string, resolution?: string, action?: string }
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { id } = await context.params;
    const body = (await request.json()) as UpdateDisputePayload;
    const { response, resolution, action, adminNotes } = body;

    // Admin resolution
    if (user.role === "admin" && resolution) {
      const { data: result } = await supabase
        .rpc("resolve_dispute", {
          p_dispute_id: id,
          p_admin_id: user.id,
          p_resolution: resolution as string,
          p_action: (action as string) || "resolved",
        })
        .single();

      const typedResult = result as { ok?: unknown; error?: unknown } | null;
      if (!typedResult?.ok) return fail(typedResult?.error as string, 400);

      // Update admin notes if provided
      if (adminNotes) {
        await supabase
          .from("disputes")
          .update({ admin_notes: adminNotes as string })
          .eq("id", id);
      }

      await logAudit({
        actorId: user.id,
        action: "dispute.resolved",
        resourceType: "dispute",
        resourceId: id,
        metadata: { resolution, action },
      });

      return ok({ ok: true, message: "Dispute resolved" });
    }

    // Participant response
    if (response) {
      const { data: result } = await supabase
        .rpc("respond_to_dispute", {
          p_dispute_id: id,
          p_user_id: user.id,
          p_response: response as string,
        })
        .single();

      const typedResult = result as { ok?: unknown; error?: unknown } | null;
      if (!typedResult?.ok) return fail(typedResult?.error as string, 400);

      return ok({ ok: true, message: "Response submitted" });
    }

    return fail("Provide response or resolution", 400);
  } catch (error) {
    console.error("PATCH /api/disputes/[id] error:", error);
    return fail("Failed to update dispute", 500);
  }
}
