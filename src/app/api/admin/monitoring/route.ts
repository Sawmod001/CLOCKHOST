import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { validateCsrfOrigin } from "@/lib/csrf";
import { checkServiceHealth } from "@/lib/monitoring";

/**
 * GET /api/admin/monitoring
 * Admin-only: system health, errors, uptime, request metrics.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof Response) return userOrResponse;

    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section") || "all";
    const hours = Math.min(168, Math.max(1, Number(searchParams.get("hours")) || 24));

    const result: Record<string, unknown> = {};

    if (section === "all" || section === "health") {
      const { data: health } = await supabase.rpc("get_service_health").single();
      result.health = health || [];
    }

    if (section === "all" || section === "errors") {
      const { data: errors } = await supabase.rpc("get_recent_errors", {
        p_limit: 50,
        p_level: null,
        p_source: null,
      }).single();
      result.errors = errors || [];

      const { data: errorSummary } = await supabase.rpc("get_error_summary", {
        p_hours: hours,
      }).single();
      result.errorSummary = errorSummary || {};
    }

    if (section === "all" || section === "requests") {
      const { data: metrics } = await supabase.rpc("get_request_metrics_summary", {
        p_hours: hours,
      }).single();
      result.requestMetrics = metrics || {};
    }

    if (section === "all" || section === "uptime") {
      const { data: uptime } = await supabase.rpc("get_uptime_status").single();
      result.uptime = uptime || [];
    }

    return ok({ ok: true, data: result, periodHours: hours });
  } catch (error) {
    console.error("GET /api/admin/monitoring error:", error);
    return fail("Failed to fetch monitoring data", 500);
  }
}

/**
 * POST /api/admin/monitoring
 * Admin-only: record a manual health check or trigger cleanup.
 *
 * Body:
 *   { action: "health_check" | "cleanup", ... }
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
      await supabase.rpc("cleanup_old_monitoring_data");
      return ok({ ok: true, message: "Old monitoring data cleaned up" });
    }

    if (action === "health_check") {
      const checks: Record<string, unknown> = {};
      checks.database = await checkServiceHealth("database", async () => {
        const { error } = await supabase.from("users").select("id").limit(1);
        if (error) throw error;
        return { connected: true };
      });
      checks.storage = await checkServiceHealth("storage", async () => {
        const { error } = await (supabase as unknown as {
          storage: { listBuckets: () => Promise<{ error: unknown }> };
        }).storage.listBuckets();
        if (error) throw error;
        return { connected: true };
      });

      return ok({ ok: true, data: checks });
    }

    return fail("Invalid action", 400);
  } catch (error) {
    console.error("POST /api/admin/monitoring error:", error);
    return fail("Failed to perform action", 500);
  }
}
