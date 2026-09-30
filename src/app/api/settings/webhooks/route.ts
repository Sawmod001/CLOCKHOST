import type { NextRequest } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { EVENT_TYPES } from "@/lib/webhooks";
import crypto from "crypto";

/**
 * GET /api/settings/webhooks
 * List webhook endpoints for the current host.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { data: endpoints, error } = await supabase
      .from("webhook_endpoints")
      .select("id, url, events, is_active, description, last_triggered_at, failure_count, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return ok({ ok: true, data: endpoints || [] });
  } catch (error) {
    console.error("GET /api/settings/webhooks error:", error);
    return fail("Failed to fetch webhooks", 500);
  }
}

/**
 * POST /api/settings/webhooks
 * Register a new webhook endpoint.
 *
 * Body:
 *   { url, events?, description? }
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json() as Record<string, unknown>);
    const { url, events = ["*"], description } = body;
    const urlStr = url as string | undefined;
    const eventsArr = (Array.isArray(events) ? events : ["*"]) as string[];

    if (!urlStr) return fail("url required", 400);

    // Validate URL format
    try {
      new URL(urlStr as string);
    } catch {
      return fail("Invalid URL format", 400);
    }

    if (!(urlStr as string).startsWith("https://")) {
      return fail("Webhook URL must use HTTPS", 400);
    }

    // Validate events
    const validEvents = ["*", ...Object.values(EVENT_TYPES)];
    const invalidEvents = eventsArr.filter((e: string) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return fail(`Invalid events: ${invalidEvents.join(", ")}`, 400);
    }

    // Generate a secret
    const secret = "whsec_" + crypto.randomBytes(32).toString("hex");

    const { data: resultRaw } = await supabase
      .rpc("register_webhook", {
        p_user_id: user.id,
        p_url: urlStr as string,
        p_secret: secret,
        p_events: eventsArr,
        p_description: (description as string) || null,
      })
      .single();

    const result = resultRaw as unknown as {
      ok?: boolean;
      error?: string;
      endpoint_id?: string;
    } | null;

    if (!result?.ok) return fail(result?.error || "Failed to create webhook", 500);

    await logAudit({
      actorId: user.id,
      action: "webhook.registered",
      resourceType: "webhook",
      resourceId: result.endpoint_id as string | null | undefined,
      metadata: { url: urlStr, events: eventsArr },
    });

    return ok({
      ok: true,
      data: {
        endpointId: result.endpoint_id,
        secret,
        warning: "Store this secret securely. It will not be shown again.",
      },
    }, 201);
  } catch (error) {
    console.error("POST /api/settings/webhooks error:", error);
    return fail("Failed to create webhook", 500);
  }
}

/**
 * DELETE /api/settings/webhooks?id=xxx
 * Delete a webhook endpoint.
 */
export async function DELETE(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { searchParams } = new URL(request.url);
    const endpointId = searchParams.get("id");

    if (!endpointId) return fail("id required", 400);

    const { data: endpoint } = await supabase
      .from("webhook_endpoints")
      .select("id, user_id, url")
      .eq("id", endpointId)
      .maybeSingle();

    if (!endpoint) return fail("Webhook not found", 404);
    if (endpoint.user_id !== user.id) return fail("Not authorized", 403);

    const { error } = await supabase
      .from("webhook_endpoints")
      .delete()
      .eq("id", endpointId);

    if (error) throw error;

    await logAudit({
      actorId: user.id,
      action: "webhook.deleted",
      resourceType: "webhook",
      resourceId: endpointId,
      metadata: { url: endpoint.url },
    });

    return ok({ ok: true });
  } catch (error) {
    console.error("DELETE /api/settings/webhooks error:", error);
    return fail("Failed to delete webhook", 500);
  }
}
