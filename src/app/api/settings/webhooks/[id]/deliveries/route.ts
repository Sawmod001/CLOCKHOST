import type { NextRequest } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";

/**
 * GET /api/settings/webhooks/[id]/deliveries
 * Get delivery stats and recent deliveries for a webhook endpoint.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const days = Math.min(30, Math.max(1, Number(searchParams.get("days")) || 7));

    // Verify ownership
    const { data: endpoint } = await supabase
      .from("webhook_endpoints")
      .select("id, user_id, url")
      .eq("id", id)
      .maybeSingle();

    if (!endpoint) return fail("Webhook not found", 404);
    if (endpoint.user_id !== user.id) return fail("Not authorized", 403);

    // Get stats
    const { data: stats } = await supabase
      .rpc("get_webhook_delivery_stats", {
        p_endpoint_id: id,
        p_days: days,
      })
      .single();

    // Get recent deliveries
    const { data: deliveries } = await supabase
      .from("webhook_deliveries")
      .select(`
        id, status, attempt, response_status, error_message, 
        delivered_at, created_at,
        webhook_events!inner(event_type, source)
      `)
      .eq("endpoint_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    return ok({
      ok: true,
      data: {
        endpointId: endpoint.id,
        url: endpoint.url,
        periodDays: days,
        stats: stats || {},
        deliveries: ((deliveries as unknown as Array<{
          id: string;
          status?: string;
          attempt?: number;
          webhook_events?: { event_type?: string; source?: string };
          response_status?: number;
          error_message?: string;
          delivered_at?: string;
          created_at?: string;
        }> | null) || []).map((d) => ({
          id: d.id,
          status: d.status,
          attempt: d.attempt,
          eventType: d.webhook_events?.event_type,
          source: d.webhook_events?.source,
          responseStatus: d.response_status,
          error: d.error_message,
          deliveredAt: d.delivered_at,
          createdAt: d.created_at,
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/settings/webhooks/[id]/deliveries error:", error);
    return fail("Failed to fetch deliveries", 500);
  }
}
