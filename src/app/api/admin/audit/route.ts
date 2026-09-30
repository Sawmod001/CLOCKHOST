import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { getResourceAuditTrail, getComplianceReport, dataRetention } from "@/lib/audit";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * GET /api/admin/audit
 * Admin-only: audit trail and compliance reports.
 *
 * Query params:
 *   - resource_type: Filter by resource type
 *   - resource_id: Filter by resource ID
 *   - days: Report period (default 30)
 *   - tag: Filter by compliance tag
 *   - section: "trail" | "report" | "retention" (default "report")
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof Response) return userOrResponse;

    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section") || "report";

    if (section === "trail") {
      const resourceType = searchParams.get("resource_type");
      const resourceId = searchParams.get("resource_id");

      if (!resourceType || !resourceId) {
        return fail("resource_type and resource_id required for trail", 400);
      }

      const trail = await getResourceAuditTrail(resourceType, resourceId);
      return ok({ ok: true, data: trail });
    }

    if (section === "retention") {
      const policies = await dataRetention.getPolicies();
      return ok({ ok: true, data: policies });
    }

    // Default: compliance report
    const days = Math.min(365, Math.max(1, Number(searchParams.get("days")) || 30));
    const tag = searchParams.get("tag") || null;

    const report = await getComplianceReport(days, tag);
    return ok({ ok: true, data: report, periodDays: days });
  } catch (error) {
    console.error("GET /api/admin/audit error:", error);
    return fail("Failed to fetch audit data", 500);
  }
}

/**
 * POST /api/admin/audit
 * Admin-only: trigger data retention cleanup.
 *
 * Body:
 *   { action: "cleanup" | "cleanup_archives", ... }
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof Response) return userOrResponse;

    const body = (await request.json()) as { action?: unknown };
    const { action } = body;

    if (action === "cleanup") {
      const result = await dataRetention.cleanup();
      return ok({ ok: true, data: result });
    }

    if (action === "cleanup_archives") {
      const deleted = await dataRetention.cleanupArchives();
      return ok({ ok: true, deleted });
    }

    return fail("Invalid action. Use: cleanup or cleanup_archives", 400);
  } catch (error) {
    console.error("POST /api/admin/audit error:", error);
    return fail("Failed to perform action", 500);
  }
}
