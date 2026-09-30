import type { NextRequest } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * GET /api/settings/api-keys
 * List API keys for the current host.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { data: keys, error } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, scopes, rate_limit_per_minute, last_used_at, expires_at, is_active, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return ok({ ok: true, data: keys || [] });
  } catch (error) {
    console.error("GET /api/settings/api-keys error:", error);
    return fail("Failed to fetch API keys", 500);
  }
}

/**
 * POST /api/settings/api-keys
 * Create a new API key.
 *
 * Body:
 *   { name, scopes?, rateLimit?, expiresDays? }
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json() as Record<string, unknown>);
    const { name, scopes = ["read"], rateLimit = 60, expiresDays } = body;
    const nameStr = name as string | undefined;
    const scopesArr = (Array.isArray(scopes) ? scopes : ["read"]) as string[];

    if (!nameStr) return fail("name required", 400);
    if (nameStr.length > 100) return fail("name must be 100 characters or fewer", 400);

    // Validate scopes
    const validScopes = ["read", "write", "bookings", "listings", "calendar", "analytics"];
    const invalidScopes = scopesArr.filter((s: string) => !validScopes.includes(s));
    if (invalidScopes.length > 0) {
      return fail(`Invalid scopes: ${invalidScopes.join(", ")}`, 400);
    }

    // Check max keys per user (10)
    const selectWithCount = supabase.from("api_keys").select as unknown as (
      cols: string,
      opts?: unknown
    ) => ReturnType<typeof supabase.from>;
    const { count } = (await selectWithCount("id", { count: "exact", head: true }).eq(
      "user_id",
      user.id
    )) as unknown as { count: number | null };

    if ((count as number) >= 10) {
      return fail("Maximum 10 API keys per user", 409);
    }

    const { data: resultRaw } = await supabase
      .rpc("generate_api_key", {
        p_user_id: user.id,
        p_name: (nameStr as string).trim(),
        p_scopes: scopesArr,
        p_rate_limit: rateLimit as number,
        p_expires_days: (expiresDays as number | null) || null,
      })
      .single();

    const result = resultRaw as unknown as {
      ok?: boolean;
      error?: string;
      key_id?: string;
      raw_key?: string;
      key_prefix?: string;
      scopes?: string[];
      expires_at?: string;
    } | null;

    if (!result?.ok) return fail(result?.error || "Failed to create key", 500);

    await logAudit({
      actorId: user.id,
      action: "api_key.created",
      resourceType: "api_key",
      resourceId: result.key_id as string | null | undefined,
      metadata: { name: (nameStr as string).trim(), scopes: scopesArr },
    });

    return ok({
      ok: true,
      data: {
        keyId: result.key_id,
        rawKey: result.raw_key,
        keyPrefix: result.key_prefix,
        scopes: result.scopes,
        expiresAt: result.expires_at,
        warning: "Store this key securely. It will not be shown again.",
      },
    }, 201);
  } catch (error) {
    console.error("POST /api/settings/api-keys error:", error);
    return fail("Failed to create API key", 500);
  }
}

/**
 * DELETE /api/settings/api-keys?id=xxx
 * Revoke an API key.
 */
export async function DELETE(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("id");

    if (!keyId) return fail("id required", 400);

    const { data: key } = await supabase
      .from("api_keys")
      .select("id, name, user_id")
      .eq("id", keyId)
      .maybeSingle();

    if (!key) return fail("API key not found", 404);
    if (key.user_id !== user.id) return fail("Not authorized", 403);

    const { error } = await supabase
      .from("api_keys")
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq("id", keyId);

    if (error) throw error;

    await logAudit({
      actorId: user.id,
      action: "api_key.revoked",
      resourceType: "api_key",
      resourceId: keyId,
      metadata: { name: key.name },
    });

    return ok({ ok: true });
  } catch (error) {
    console.error("DELETE /api/settings/api-keys error:", error);
    return fail("Failed to revoke API key", 500);
  }
}
