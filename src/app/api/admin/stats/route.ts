import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";

/**
 * GET /api/admin/stats
 * Comprehensive admin dashboard statistics.
 * Returns listing, booking, user, and revenue stats.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof Response) return userOrResponse;

    const { data: stats, error } = await supabase
      .rpc("get_admin_stats")
      .single();

    if (error) throw error;

    return ok({ ok: true, data: stats });
  } catch (error) {
    console.error("GET /api/admin/stats error:", error);
    return fail("Failed to fetch admin stats", 500);
  }
}
