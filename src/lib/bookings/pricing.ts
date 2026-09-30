import type { DbListing, DbListingPricing, DbListingAddOn } from "@/types/db";
import type { PricingBreakdown } from "@/types/domain";

// ─── Shared helpers ───────────────────────────────────────────────────────────

export function hoursBetween(start: string | Date, end: string | Date): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, ms / (1_000 * 60 * 60));
}

function addonPriceKobo(addon: Partial<DbListingAddOn>): number {
  return (
    Number(
      addon.priceInKobo ??
      (addon as Record<string, unknown>)["price_in_kobo"] ??
      (addon as Record<string, unknown>)["priceKobo"] ??
      0
    ) || 0
  );
}

// ─── Discount helpers ─────────────────────────────────────────────────────────

function computeMultiGuestDiscount(
  headcount: number,
  pricing: DbListingPricing | undefined
): number {
  if (headcount < 2) return 0;
  const tiers = pricing?.multiGuestDiscountTiers ?? [];
  let discountPercent = 0;
  for (const tier of tiers) {
    if (headcount >= tier.minGuests) discountPercent = tier.percent;
  }
  return discountPercent;
}

function computeHourlyDiscount(
  hours: number,
  pricing: DbListingPricing | undefined
): number {
  const tiers = pricing?.hourlyDiscountTiers ?? [];
  let discountPercent = 0;
  for (const tier of tiers) {
    if (hours >= tier.minHours) discountPercent = tier.percent;
  }
  return discountPercent;
}

function computeCommission(
  totalAmountKobo: number,
  pricing: DbListingPricing | undefined
): number {
  const commissionRate = pricing?.commissionRatePercent ?? 5;
  return Math.round((totalAmountKobo * commissionRate) / 100);
}

/**
 * Venue-spend entitlement — display-only per PRODUCT_TRUTH TRUTH-3.
 * Never subtracted from the total.
 */
function computeVenueSpendEntitlement(
  headcount: number,
  hours: number,
  pricing: DbListingPricing | undefined
): number {
  const rate = Number(
    (pricing as Record<string, unknown> | undefined)?.["venueSpendRateKobo"] ??
    (pricing as Record<string, unknown> | undefined)?.["venue_spend_rate_kobo"] ??
    0
  );
  if (!rate || !headcount || !hours) return 0;
  return Math.round(rate * headcount * hours);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface CapacityPriceInput {
  listing: Pick<DbListing, "pricing" | "add_ons"> & Partial<DbListing>;
  eventStart: string | Date;
  eventEnd: string | Date;
  headcount: number;
  addOnIds?: string[];
  includeRequired?: boolean;
}

/**
 * Compute total price in kobo for a capacity booking.
 * Returns a single number for quick payment initiation.
 */
export function computeCapacityPriceKobo({
  listing,
  eventStart,
  eventEnd,
  headcount,
  addOnIds = [],
  includeRequired = false,
}: CapacityPriceInput): number {
  const baseRatePerHour = Number(listing?.pricing?.baseRatePerHour) || 0;
  const people = Math.max(1, Number(headcount) || 0);
  const hours = hoursBetween(eventStart, eventEnd);
  const baseKobo = baseRatePerHour * people * hours;

  const menu = new Map(
    (listing?.add_ons ?? []).map((a) => [a.id, addonPriceKobo(a)])
  );
  let addOnsKobo = [...new Set(addOnIds)].reduce(
    (sum, id) => sum + (menu.get(id) ?? 0),
    0
  );
  if (includeRequired) {
    addOnsKobo += (listing?.add_ons ?? [])
      .filter((a) => a.isRequired)
      .reduce((sum, a) => sum + addonPriceKobo(a), 0);
  }

  let subtotal = baseKobo + addOnsKobo;

  const multiGuestPct = computeMultiGuestDiscount(people, listing?.pricing);
  if (multiGuestPct > 0) {
    subtotal -= Math.round((baseKobo * multiGuestPct) / 100);
  }

  const hourlyPct = computeHourlyDiscount(hours, listing?.pricing);
  if (hourlyPct > 0) {
    subtotal -= Math.round((baseKobo * hourlyPct) / 100);
  }

  return Math.max(0, Math.round(subtotal));
}

/**
 * Compute the exclusive flat fee for an exclusive booking.
 */
export function computeExclusiveFeeKobo(
  listing: Pick<DbListing, "pricing"> & Partial<DbListing>
): number {
  return Number(listing?.pricing?.exclusiveFlatFeeKobo) || 0;
}

/**
 * Compute platform commission for a booking.
 */
export function computeCommissionKobo(
  totalAmountKobo: number,
  listing: Pick<DbListing, "pricing"> & Partial<DbListing>
): number {
  return computeCommission(totalAmountKobo, listing?.pricing);
}

/**
 * Compute the Paystack transaction fee — PRODUCT_TRUTH TRUTH-10 / §17.
 *
 * Domestic:      min(1.5% × amount + ₦100, ₦2000); ₦100 waived when amount < ₦2500
 * International: min(3.9% × amount + ₦100, ₦5000)
 */
export function computePaystackFeeKobo(
  amountKobo: number,
  isInternational = false
): number {
  if (amountKobo <= 0) return 0;
  const amountNaira = amountKobo / 100;

  if (isInternational) {
    const feeNaira = amountNaira * 0.039 + 100;
    return Math.round(Math.min(feeNaira, 5_000) * 100);
  }

  const percentFee = amountNaira * 0.015;
  const waived = amountKobo < 250_000; // ₦2500 threshold
  const feeNaira = percentFee + (waived ? 0 : 100);
  return Math.round(Math.min(feeNaira, 2_000) * 100);
}

/**
 * Compute the full pricing breakdown for a capacity/exclusive booking.
 * Returns all components needed for display and the pricing snapshot.
 */
export function computePricingBreakdown({
  listing,
  eventStart,
  eventEnd,
  headcount,
  addOnIds = [],
  includeRequired = false,
}: CapacityPriceInput): PricingBreakdown {
  const baseRatePerHour = Number(listing?.pricing?.baseRatePerHour) || 0;
  const people = Math.max(1, Number(headcount) || 0);
  const hours = hoursBetween(eventStart, eventEnd);
  const baseKobo = baseRatePerHour * people * hours;

  const menu = new Map(
    (listing?.add_ons ?? []).map((a) => [a.id, addonPriceKobo(a)])
  );
  let selectedAddOnsKobo = [...new Set(addOnIds)].reduce(
    (sum, id) => sum + (menu.get(id) ?? 0),
    0
  );
  if (includeRequired) {
    selectedAddOnsKobo += (listing?.add_ons ?? [])
      .filter((a) => a.isRequired)
      .reduce((sum, a) => sum + addonPriceKobo(a), 0);
  }

  let subtotal = baseKobo + selectedAddOnsKobo;

  const multiGuestDiscountPercent = computeMultiGuestDiscount(people, listing?.pricing);
  const multiGuestDiscountKobo =
    multiGuestDiscountPercent > 0
      ? Math.round((baseKobo * multiGuestDiscountPercent) / 100)
      : 0;
  subtotal -= multiGuestDiscountKobo;

  const hourlyDiscountPercent = computeHourlyDiscount(hours, listing?.pricing);
  const hourlyDiscountKobo =
    hourlyDiscountPercent > 0
      ? Math.round((baseKobo * hourlyDiscountPercent) / 100)
      : 0;
  subtotal -= hourlyDiscountKobo;

  const totalAmountKoboBase = Math.max(0, Math.round(subtotal));
  const exclusiveFeeKobo =
    listing?.booking_type === "exclusive" ? computeExclusiveFeeKobo(listing) : 0;
  const totalAmountKobo = totalAmountKoboBase + exclusiveFeeKobo;

  const commissionRate = listing?.pricing?.commissionRatePercent ?? 5;
  const commissionKobo = computeCommission(totalAmountKobo, listing?.pricing);

  // Venue-spend entitlement — display only (TRUTH-3)
  const venueSpendEntitlementKobo = computeVenueSpendEntitlement(
    people,
    hours,
    listing?.pricing
  );

  // Settlement split
  const venueComponentRateKobo = (
    listing?.pricing as Record<string, unknown> | undefined
  )?.["venueComponentRateKobo"];
  const venueComponentKobo = venueComponentRateKobo != null
    ? Math.round(Number(venueComponentRateKobo) * people * hours)
    : 0;
  const platformComponentKobo = venueComponentKobo
    ? Math.max(0, totalAmountKobo - venueComponentKobo)
    : totalAmountKobo - commissionKobo;

  return {
    baseRatePerHour,
    headcount: people,
    hours,
    baseKobo,
    selectedAddOnsKobo,
    multiGuestDiscountPercent,
    multiGuestDiscountKobo,
    hourlyDiscountPercent,
    hourlyDiscountKobo,
    venueSpendEntitlementKobo,
    venueComponentKobo,
    platformComponentKobo,
    exclusiveFeeKobo,
    totalAmountKobo,
    commissionRate,
    commissionKobo,
    paystackFeeKobo: computePaystackFeeKobo(totalAmountKobo),
    pricingRuleVersion: "1.0",
  };
}
