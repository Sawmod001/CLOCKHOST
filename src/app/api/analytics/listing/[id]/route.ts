import type { NextRequest } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";

/**
 * GET /api/analytics/listing/[id]?days=30
 * Get detailed analytics for a single listing.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const days = Math.min(365, Math.max(1, Number(searchParams.get("days")) || 30));

    const { data: stats, error } = await supabase
      .rpc("get_listing_analytics", {
        p_listing_id: id,
        p_host_id: user.id,
        p_days: days,
      })
      .single();

    if (error) throw error;
    const typedStats = stats as { error?: unknown } | null;
    if (typedStats?.error) return fail(typedStats.error as string, 404);

    return ok({ ok: true, data: stats });
  } catch (error) {
    console.error("GET /api/analytics/listing/[id] error:", error);
    return fail("Failed to fetch listing analytics", 500);
  }
}
