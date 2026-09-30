import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * GET /api/documents?bookingId=xxx
 * List documents for a booking.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");
    const docType = searchParams.get("type");

    if (!bookingId) return fail("bookingId required", 400);

    // Verify access
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, guest_id, listing_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) return fail("Booking not found", 404);

    const isGuest = booking.guest_id === user.id;
    let isHost = false;

    if (!isGuest) {
      const { data: listing } = await supabase
        .from("listings")
        .select("provider_profile_id")
        .eq("id", booking.listing_id)
        .maybeSingle();

      if (listing && user.providerProfile?.id === listing.provider_profile_id) {
        isHost = true;
      }
    }

    if (!isGuest && !isHost && user.role !== "admin") {
      return fail("Not authorized", 403);
    }

    let query = supabase
      .from("documents")
      .select("id, document_type, status, generated_at, sent_at, file_content")
      .eq("booking_id", bookingId)
      .order("generated_at", { ascending: false });

    if (docType) {
      query = query.eq("document_type", docType);
    }

    const { data: docs, error } = await query;
    if (error) throw error;

    return ok({ ok: true, data: docs || [] });
  } catch (error) {
    console.error("GET /api/documents error:", error);
    return fail("Failed to fetch documents", 500);
  }
}

/**
 * POST /api/documents
 * Generate a document for a booking.
 *
 * Body:
 *   { bookingId, type }
 *
 * Types: receipt, booking_confirmation, cancellation_receipt, terms_and_conditions
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json()) as { bookingId?: unknown; type?: unknown };
    const { bookingId, type } = body;

    if (!bookingId || !type) return fail("bookingId and type required", 400);

    const validTypes = ["receipt", "booking_confirmation", "cancellation_receipt", "terms_and_conditions"];
    if (!validTypes.includes(type as string)) {
      return fail(`type must be one of: ${validTypes.join(", ")}`, 400);
    }

    // Verify access
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, guest_id, listing_id, status")
      .eq("id", bookingId as string)
      .maybeSingle();

    if (!booking) return fail("Booking not found", 404);

    const isGuest = booking.guest_id === user.id;
    let isHost = false;

    if (!isGuest) {
      const { data: listing } = await supabase
        .from("listings")
        .select("provider_profile_id")
        .eq("id", booking.listing_id)
        .maybeSingle();

      if (listing && user.providerProfile?.id === listing.provider_profile_id) {
        isHost = true;
      }
    }

    if (!isGuest && !isHost && user.role !== "admin") {
      return fail("Not authorized", 403);
    }

    // Generate document using database function
    let rpcResult: { ok?: unknown; error?: unknown; document_id?: string; document_type?: string; content?: unknown } | null = null;
    switch (type) {
      case "receipt":
        ({ data: rpcResult } = await supabase.rpc("generate_receipt", {
          p_booking_id: bookingId as string,
          p_generated_by: user.id,
        }));
        break;
      case "booking_confirmation":
        ({ data: rpcResult } = await supabase.rpc("generate_booking_confirmation", {
          p_booking_id: bookingId as string,
          p_generated_by: user.id,
        }));
        break;
      default:
        return fail("Document type not yet implemented", 501);
    }

    if (!rpcResult?.ok) {
      return fail((rpcResult?.error as string) || "Failed to generate document", 500);
    }

    await logAudit({
      actorId: user.id,
      action: "document.generated",
      resourceType: "document",
      resourceId: rpcResult.document_id,
      metadata: { booking_id: bookingId as string, document_type: type as string },
    });

    return ok({
      ok: true,
      data: {
        documentId: rpcResult.document_id,
        documentType: rpcResult.document_type,
        content: rpcResult.content,
      },
    }, 201);
  } catch (error) {
    console.error("POST /api/documents error:", error);
    return fail("Failed to generate document", 500);
  }
}
