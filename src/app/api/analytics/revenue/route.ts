import type { NextRequest } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";

/**
 * GET /api/analytics/revenue?startDate=2024-01-01&endDate=2024-01-31
 * Get detailed revenue report for the host.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || null;
    const endDate = searchParams.get("endDate") || null;

    const { data: report, error } = await supabase
      .rpc("get_revenue_report", {
        p_host_id: user.id,
        p_start_date: startDate,
        p_end_date: endDate,
      })
      .single();

    if (error) throw error;

    return ok({ ok: true, data: report });
  } catch (error) {
    console.error("GET /api/analytics/revenue error:", error);
    return fail("Failed to fetch revenue report", 500);
  }
}
