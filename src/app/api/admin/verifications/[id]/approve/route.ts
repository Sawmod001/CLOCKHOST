import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/helpers";
import { findVerificationById, updateVerification, findProviderProfileById, updateProviderProfile, listVerificationsByProviderProfile } from "@/lib/db/supabase-queries";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";

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
      return NextResponse.json({ error: "Can only approve pending verifications" }, { status: 409 });
    }

    // Approve the verification
    await updateVerification(id, {
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    });

    // Check if ALL required verification types for this provider are now approved
    const allVerifications = await listVerificationsByProviderProfile(verification.provider_profile_id);
    const requiredTypes = ["identity", "business"];
    const approvedTypes = allVerifications
      .filter((v) => v.status === "approved")
      .map((v) => v.verification_type);
    const allRequiredApproved = requiredTypes.every((t) => (approvedTypes as string[]).includes(t));

    if (allRequiredApproved) {
      // All required verifications approved → mark provider as verified
      const profile = await findProviderProfileById(verification.provider_profile_id);
      if (profile && profile.verification_status !== "approved") {
        await updateProviderProfile(profile.id, {
          verification_status: "approved",
          verified_at: new Date().toISOString(),
        });
      }
    }

    await logAudit({
      actorId: user.id,
      action: "verification.approved",
      resourceType: "provider_verification",
      resourceId: id,
      metadata: { verification_type: verification.verification_type, provider_profile_id: verification.provider_profile_id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/admin/verifications/[id]/approve error:", error);
    return NextResponse.json({ error: "Failed to approve verification" }, { status: 500 });
  }
}
