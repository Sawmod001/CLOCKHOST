import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/helpers";
import { findVerificationById, updateVerification, updateProviderProfile, listVerificationsByProviderProfile } from "@/lib/db/supabase-queries";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { z } from "zod";

const RejectSchema = z.object({
  reason: z.string().min(5).max(500),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { id } = await context.params;
    const verification = await findVerificationById(id);
    if (!verification) {
      return NextResponse.json({ error: "Verification not found" }, { status: 404 });
    }

    if (verification.status !== "pending") {
      return NextResponse.json({ error: "Can only reject pending verifications" }, { status: 409 });
    }

    const body: unknown = await request.json();
    const parsed = RejectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    // Reject the verification
    await updateVerification(id, {
      status: "rejected",
      review_note: parsed.data.reason,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    });

    // Check if ANY verification for this provider is still approved → if not, downgrade overall status
    const allVerifications = await listVerificationsByProviderProfile(verification.provider_profile_id);
    const hasApproved = allVerifications.some((v) => v.status === "approved" && v.id !== id);
    if (!hasApproved) {
      await updateProviderProfile(verification.provider_profile_id, {
        verification_status: "rejected",
      });
    }

    await logAudit({
      actorId: user.id,
      action: "verification.rejected",
      resourceType: "provider_verification",
      resourceId: id,
      metadata: { verification_type: verification.verification_type, reason: parsed.data.reason, provider_profile_id: verification.provider_profile_id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/admin/verifications/[id]/reject error:", error);
    return NextResponse.json({ error: "Failed to reject verification" }, { status: 500 });
  }
}
