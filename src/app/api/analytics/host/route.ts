import type { NextRequest } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";

/**
 * GET /api/analytics/host?days=30
 * Get comprehensive host analytics.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { searchParams } = new URL(request.url);
    const days = Math.min(365, Math.max(1, Number(searchParams.get("days")) || 30));

    const { data: stats, error } = await supabase
      .rpc("get_host_analytics", {
        p_host_id: user.id,
        p_days: days,
      })
      .single();

    if (error) throw error;

    return ok({ ok: true, data: stats });
  } catch (error) {
    console.error("GET /api/analytics/host error:", error);
    return fail("Failed to fetch host analytics", 500);
  }
}
