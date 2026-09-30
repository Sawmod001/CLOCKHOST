import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * GET /api/messages/[id]
 * Get conversation details and messages.
 *
 * Query params:
 *   ?limit=50&offset=0  — pagination
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    // Verify user is participant
    const { data: conversationRaw } = await supabase
      .from("conversations")
      .select(`
        id, status, guest_unread_count, host_unread_count, created_at,
        listing:listing_id(id, title, vertical, media, pricing),
        guest:guest_id(id, full_name, avatar_url, email),
        host:host_id(id, full_name, avatar_url, email),
        booking:booking_id(id, event_start, event_end, status)
      `)
      .eq("id", id)
      .maybeSingle();

    const conversation = conversationRaw as unknown as {
      guest?: { id?: string } | null;
      host?: { id?: string } | null;
      guest_unread_count?: number;
      host_unread_count?: number;
    } | null;

    if (!conversation) return fail("Conversation not found", 404);

    const isGuest = conversation.guest?.id === user.id;
    const isHost = conversation.host?.id === user.id;

    if (!isGuest && !isHost) {
      return fail("Not authorized", 403);
    }

    // Fetch messages
    const { data: messagesRaw, error: msgError } = await supabase
      .from("messages")
      .select("id, sender_id, content, message_type, read_at, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (msgError) throw msgError;

    const messages = messagesRaw as unknown as Record<string, unknown>[] | null;
    return ok({
      ok: true,
      data: {
        ...conversation,
        yourRole: isGuest ? "guest" : "host",
        unreadCount: isGuest ? conversation.guest_unread_count : conversation.host_unread_count,
        messages: (messages || []).reverse(),
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("GET /api/messages/[id] error:", error);
    return fail("Failed to fetch conversation", 500);
  }
}

/**
 * PATCH /api/messages/[id]
 * Mark conversation as read.
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { id } = await context.params;

    const { data: result, error } = await supabase
      .rpc("mark_conversation_read", {
        p_conversation_id: id,
        p_user_id: user.id,
      })
      .single();

    if (error) throw error;

    return ok({ ok: true, data: { marked: result } });
  } catch (error) {
    console.error("PATCH /api/messages/[id] error:", error);
    return fail("Failed to mark as read", 500);
  }
}
