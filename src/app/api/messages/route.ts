import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { validateCsrfOrigin } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/messages
 * List conversations for the current user.
 *
 * Query params:
 *   ?role=guest|host  — filter by role (default: all)
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    let query = supabase
      .from("conversations")
      .select(`
        id, last_message_at, last_message_preview,
        guest_unread_count, host_unread_count, status, created_at,
        listing:listing_id(id, title, vertical, media),
        guest:guest_id(id, full_name, avatar_url),
        host:host_id(id, full_name, avatar_url),
        booking:booking_id(id, event_start, event_end, status)
      `)
      .order("last_message_at", { ascending: false, nullsFirst: false } as unknown as { ascending?: boolean });

    if (role === "guest") {
      query = query.eq("guest_id", user.id);
    } else if (role === "host") {
      query = query.eq("host_id", user.id);
    } else {
      query = query.or(`guest_id.eq.${user.id},host_id.eq.${user.id}`);
    }

    const { data: conversations, error } = await query;
    if (error) throw error;

    return ok({ ok: true, data: conversations || [] });
  } catch (error) {
    console.error("GET /api/messages error:", error);
    return fail("Failed to fetch conversations", 500);
  }
}

/**
 * POST /api/messages
 * Create a conversation or send a message.
 *
 * Body:
 *   { listingId, guestId?, bookingId?, content, templateId? }
 *
 * - If conversationId is in body, sends message to existing conversation
 * - Otherwise creates new conversation
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const rateLimited = checkRateLimit(request, { windowMs: 60_000, max: 30 }, "send-message");
    if (rateLimited) return rateLimited;

    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json() as Record<string, unknown>);
    const { conversationId, listingId, guestId, bookingId, content, templateId } = body;
    const contentStr = content as string | undefined;

    // Validate content
    if (!contentStr || contentStr.trim().length === 0) {
      return fail("content required", 400);
    }
    if (contentStr.length > 5000) {
      return fail("content must be 5000 characters or fewer", 400);
    }

    let targetConversationId = conversationId;

    // Create conversation if needed
    if (!targetConversationId) {
      if (!listingId) return fail("listingId required for new conversation", 400);

      // Determine guest_id
      const guestUserId = guestId || user.id;

      // Verify the user is either the guest or the host
      const { data: listing } = await supabase
        .from("listings")
        .select("id, provider_profile_id")
        .eq("id", listingId)
        .maybeSingle();

      if (!listing) return fail("Listing not found", 404);

      const { data: profile } = await supabase
        .from("provider_profiles")
        .select("user_id")
        .eq("id", listing.provider_profile_id)
        .maybeSingle();

      const isHost = profile?.user_id === user.id;
      const isGuest = guestUserId === user.id;

      if (!isHost && !isGuest) {
        return fail("Not authorized to create this conversation", 403);
      }

      // Use database function
      const { data: convId, error: convError } = await supabase
        .rpc("get_or_create_conversation", {
          p_listing_id: listingId,
          p_guest_id: guestUserId,
          p_booking_id: bookingId || null,
        })
        .single();

      if (convError) return fail(convError.message, 400);
      targetConversationId = convId;
    }

    // Send message
    const { data: messageId, error: msgError } = await supabase
      .rpc("send_message", {
        p_conversation_id: targetConversationId as string,
        p_sender_id: user.id,
        p_content: (contentStr as string).trim(),
        p_message_type: templateId ? "template" : "text",
        p_template_id: (templateId as string | null) || null,
      })
      .single();

    if (msgError) return fail(msgError.message, 400);

    return ok({
      ok: true,
      data: {
        messageId,
        conversationId: targetConversationId,
      },
    }, 201);
  } catch (error) {
    console.error("POST /api/messages error:", error);
    return fail("Failed to send message", 500);
  }
}
