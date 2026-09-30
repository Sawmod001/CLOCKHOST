import type { NextRequest } from "next/server";
import { findListingById } from "@/lib/db/supabase-queries";
import { computePricingBreakdown } from "@/lib/bookings/pricing";
import { ok, fail } from "@/lib/db/supabase-utils";
import { validateCsrfOrigin } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const rateLimited = checkRateLimit(request, { windowMs: 60_000, max: 30 }, "pricing-preview");
    if (rateLimited) return rateLimited;

    const payload = (await request.json() as Record<string, unknown>);
    const { listingId, eventStart, eventEnd, headcount = 1, addOnIds = [] } = payload;

    if (!listingId || !eventStart || !eventEnd) {
      return fail("listingId, eventStart, eventEnd required", 400);
    }

    const listing = await findListingById(listingId as string);
    if (!listing) return fail("Listing not found", 404);
    if (listing.status !== "active") return fail("Listing is not active", 409);

    const breakdown = computePricingBreakdown({
      listing,
      eventStart: eventStart as string | Date,
      eventEnd: eventEnd as string | Date,
      headcount: Math.max(1, Number(headcount) || 1),
      addOnIds: addOnIds as string[] | undefined,
      includeRequired: true,
    });

    return ok({
      totalAmountKobo: breakdown.totalAmountKobo,
      commissionKobo: breakdown.commissionKobo,
      paystackFeeKobo: breakdown.paystackFeeKobo,
      breakdown: {
        baseRatePerHour: breakdown.baseRatePerHour,
        headcount: breakdown.headcount,
        hours: breakdown.hours,
        baseKobo: breakdown.baseKobo,
        selectedAddOnsKobo: breakdown.selectedAddOnsKobo,
        multiGuestDiscountPercent: breakdown.multiGuestDiscountPercent,
        multiGuestDiscountKobo: breakdown.multiGuestDiscountKobo,
        hourlyDiscountPercent: breakdown.hourlyDiscountPercent,
        hourlyDiscountKobo: breakdown.hourlyDiscountKobo,
        venueSpendDiscountPercent: (breakdown as unknown as Record<string, unknown>).venueSpendDiscountPercent as number | undefined,
        venueSpendDiscountKobo: (breakdown as unknown as Record<string, unknown>).venueSpendDiscountKobo as number | undefined,
        exclusiveFeeKobo: breakdown.exclusiveFeeKobo,
        commissionRate: breakdown.commissionRate,
      },
    });
  } catch (error) {
    console.error("POST /api/pricing/preview error:", error);
    return fail("Failed to calculate price", 500);
  }
}
