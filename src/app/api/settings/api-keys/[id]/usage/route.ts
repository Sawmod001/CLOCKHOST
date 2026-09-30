import type { NextRequest } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";

/**
 * GET /api/settings/api-keys/[id]/usage
 * Get usage stats for a specific API key.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const days = Math.min(90, Math.max(1, Number(searchParams.get("days")) || 30));

    // Verify ownership
    const { data: key } = await supabase
      .from("api_keys")
      .select("id, user_id, name")
      .eq("id", id)
      .maybeSingle();

    if (!key) return fail("API key not found", 404);
    if (key.user_id !== user.id) return fail("Not authorized", 403);

    const { data: stats, error } = await supabase
      .rpc("get_api_key_stats", {
        p_api_key_id: id,
        p_days: days,
      })
      .single();

    if (error) throw error;

    return ok({
      ok: true,
      data: {
        keyId: key.id,
        keyName: key.name,
        periodDays: days,
        ...stats,
      },
    });
  } catch (error) {
    console.error("GET /api/settings/api-keys/[id]/usage error:", error);
    return fail("Failed to fetch usage stats", 500);
  }
}
