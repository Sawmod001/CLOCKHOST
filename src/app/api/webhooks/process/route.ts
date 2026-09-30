import type { NextRequest } from "next/server";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { processPendingDeliveries } from "@/lib/webhooks";

/**
 * POST /api/webhooks/process
 * Process pending webhook deliveries.
 * Called by cron job or external scheduler.
 *
 * Headers:
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return fail("CRON_SECRET not configured", 500);

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return fail("Unauthorized", 401);
    }

    const body = (await request.json().catch(() => ({})) as Record<string, unknown>);
    const batchSize = Math.min(50, Math.max(1, (body.batchSize as number) || 10));

    const processed = await processPendingDeliveries(batchSize);

    return ok({ ok: true, processed });
  } catch (error) {
    console.error("POST /api/webhooks/process error:", error);
    return fail("Failed to process webhooks", 500);
  }
}

/**
 * GET /api/webhooks/process
 * Health check for the webhook processor.
 */
export async function GET() {
  return ok({ ok: true, service: "webhook-processor" });
}
