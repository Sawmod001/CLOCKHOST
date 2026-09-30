import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { listReviews, createReview, findBookingById, findReviewByBooking, findListingById } from "@/lib/db/supabase-queries";
import { toCamelCase, ok, cachedOk, fail, notFound, forbidden } from "@/lib/db/supabase-utils";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const p = await context.params;
    const reviews = await listReviews(p.id);
    return cachedOk({ data: reviews.map(toCamelCase) });
  } catch (error) {
    console.error("GET /api/listings/[id]/reviews error:", error);
    return fail("Failed to fetch reviews", 500);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const rateLimited = checkRateLimit(request, { windowMs: 60_000, max: 5 }, "create-review");
    if (rateLimited) return rateLimited;

    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const p = await context.params;
    const body = (await request.json() as Record<string, unknown>);
    const { bookingId, rating, reviewText } = body;
    const ratingNum = rating as number;
    const reviewStr = reviewText as string | undefined;
    const bookingIdStr = bookingId as string;

    if (!bookingId || !rating) return fail("Missing bookingId or rating", 400);
    if (ratingNum < 1 || ratingNum > 5) return fail("Rating must be between 1 and 5", 400);
    if (reviewStr && reviewStr.length > 2000) return fail("Review text must be 2000 characters or fewer", 400);

    const booking = await findBookingById(bookingIdStr);
    if (!booking) return notFound("Booking not found");
    if (booking.guest_id !== user.id) return fail("Not your booking", 403);
    if (booking.status !== "completed") return fail("Can only review completed bookings", 400);
    if (booking.listing_id !== p.id) return fail("Booking does not match this listing", 400);

    // A host can't review their own listing, and one review per booking.
    const existing = await findReviewByBooking(bookingIdStr);
    if (existing) return fail("You already reviewed this booking", 409);

    const listing = await findListingById(p.id);
    if (listing && user.providerProfile?.id === listing.provider_profile_id) return forbidden("Providers cannot review their own listings");

    const review = await createReview({
      listing_id: p.id,
      guest_id: user.id,
      booking_id: bookingIdStr,
      rating: ratingNum,
      review_text: reviewStr || "",
    } as unknown as Parameters<typeof createReview>[0]);

    await logAudit({
      actorId: user.id,
      action: "review.created",
      resourceType: "review",
      resourceId: review.id,
      metadata: { listing_id: p.id, booking_id: bookingId, rating },
    });

    return ok(toCamelCase(review), 201);
  } catch (error) {
    console.error("POST /api/listings/[id]/reviews error:", error);
    return fail("Failed to create review", 500);
  }
}
