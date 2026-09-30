import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { redisCache, warmCache } from "@/lib/cache";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * POST /api/admin/cache
 * Admin-only: cache management.
 *
 * Actions:
 *   - warm: Pre-populate cache with popular data
 *   - clear: Clear all cached data
 *   - stats: Get cache statistics
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof Response) return userOrResponse;

    const body = (await request.json()) as { action?: unknown };
    const { action } = body;

    if (action === "warm") {
      await warmCache(supabase);
      return ok({ ok: true, message: "Cache warmed" });
    }

    if (action === "clear") {
      await redisCache.del("*");
      return ok({ ok: true, message: "Cache cleared" });
    }

    if (action === "stats") {
      const stats = await redisCache.stats();
      return ok({ ok: true, data: stats });
    }

    return fail("Invalid action. Use: warm, clear, or stats", 400);
  } catch (error) {
    console.error("POST /api/admin/cache error:", error);
    return fail("Failed to perform cache action", 500);
  }
}

/**
 * GET /api/admin/cache
 * Admin-only: get cache stats.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof Response) return userOrResponse;

    const stats = await redisCache.stats();
    return ok({ ok: true, data: stats });
  } catch (error) {
    console.error("GET /api/admin/cache error:", error);
    return fail("Failed to get cache stats", 500);
  }
}
