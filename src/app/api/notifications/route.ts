import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * GET /api/notifications
 * List notifications for the current user with unread count.
 *
 * Query params:
 *   ?unread=true  — only unread
 *   ?limit=20     — max results (default 50)
 *   ?offset=0     — pagination
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    let query: ReturnType<typeof supabase.from> = supabase
      .from("notifications")
      .select("id, type, title, body, link, metadata, channel, created_at, read_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    type QueryWithIs = ReturnType<typeof supabase.from> & {
      is: (col: string, val: unknown) => ReturnType<typeof supabase.from>;
    };

    if (unreadOnly) {
      query = (query as unknown as QueryWithIs).is("read_at", null);
    }

    const { data: notifications, error } = await query;
    if (error) throw error;

    // Get unread count
    const selectWithCount = supabase.from("notifications").select as unknown as (
      cols: string,
      opts?: unknown
    ) => ReturnType<typeof supabase.from>;
    const unreadQuery = selectWithCount("id", { count: "exact", head: true }).eq(
      "user_id",
      user.id
    ) as unknown as QueryWithIs;
    const { count: unreadCount } = (await unreadQuery.is("read_at", null)) as unknown as {
      count: number | null;
    };

    return ok({
      ok: true,
      data: {
        notifications: notifications || [],
        unreadCount: unreadCount || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return fail("Failed to fetch notifications", 500);
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read.
 *
 * Body:
 *   { ids?: string[] }  — mark specific notifications as read
 *   { markAll?: true }  — mark all as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json() as Record<string, unknown>);
    const { ids, markAll } = body;

    if (markAll) {
      const { count } = (await (supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id) as unknown as {
        is: (col: string, val: unknown) => Promise<{ count: number | null }>;
      }).is("read_at", null)) as unknown as { count: number | null };

      return ok({ ok: true, marked: count || 0 });
    }

    if (ids && Array.isArray(ids) && ids.length > 0) {
      const { count } = (await (supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids as string[])
        .eq("user_id", user.id) as unknown as {
        is: (col: string, val: unknown) => Promise<{ count: number | null }>;
      }).is("read_at", null)) as unknown as { count: number | null };

      return ok({ ok: true, marked: count || 0 });
    }

    return fail("Provide ids array or markAll: true", 400);
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return fail("Failed to update notifications", 500);
  }
}
