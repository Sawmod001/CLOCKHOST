import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * POST /api/disputes/[id]/evidence
 * Submit evidence for a dispute.
 *
 * Body:
 *   { evidenceType, fileUrl?, description? }
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { id } = await context.params;
    const body = (await request.json()) as { evidenceType?: unknown; fileUrl?: unknown; description?: unknown };
    const { evidenceType, fileUrl, description } = body;

    if (!evidenceType) return fail("evidenceType required", 400);

    const validTypes = ["photo", "video", "document", "message_screenshot", "other"];
    if (!validTypes.includes(evidenceType as string)) {
      return fail(`evidenceType must be one of: ${validTypes.join(", ")}`, 400);
    }

    // Verify dispute exists and user is participant
    const { data: disputeRaw } = await supabase
      .from("disputes")
      .select("id, filed_by, against_user_id, status")
      .eq("id", id)
      .maybeSingle();

    const dispute = disputeRaw as unknown as {
      filed_by?: string;
      against_user_id?: string;
      status?: string;
    } | null;

    if (!dispute) return fail("Dispute not found", 404);

    const isAdmin = user.role === "admin";
    const isFilier = dispute.filed_by === user.id;
    const isAgainst = dispute.against_user_id === user.id;

    if (!isAdmin && !isFilier && !isAgainst) {
      return fail("Not authorized", 403);
    }

    if (!["open", "under_review", "awaiting_response"].includes(dispute.status as string)) {
      return fail("Dispute is not accepting evidence", 409);
    }

    const { data: evidenceRaw, error } = await supabase
      .from("dispute_evidence")
      .insert({
        dispute_id: id,
        submitted_by: user.id,
        evidence_type: evidenceType as string,
        file_url: (fileUrl as string | undefined) || null,
        description: (description as string | undefined) || null,
      })
      .select()
      .single();

    const evidence = evidenceRaw as unknown as { id: string } | null;

    if (error) throw error;

    return ok({ ok: true, data: { evidenceId: evidence?.id } }, 201);
  } catch (error) {
    console.error("POST /api/disputes/[id]/evidence error:", error);
    return fail("Failed to submit evidence", 500);
  }
}
