/**
 * Housing pricing engine — §41 monthly lease model + nightly/weekly compatibility.
 *
 * Monthly lease: monthlyRate × months − lease-duration discount + cleaning + 5% service fee
 * Lease discounts are configurable per listing via listing.pricing.leaseDiscounts.
 */

import type { HousingPriceBreakdown, HousingMonthlyBreakdown } from "@/types/domain";

const SERVICE_FEE_PERCENT = 5;

export interface ComputeHousingPriceInput {
  nightlyRateKobo: number;
  weeklyRateKobo?: number;
  monthlyRateKobo?: number;
  cleaningFeeKobo?: number;
  nights: number;
}

/**
 * Compute the total price for a nightly/weekly/monthly housing booking.
 */
export function computeHousingPriceKobo({
  nightlyRateKobo,
  weeklyRateKobo,
  monthlyRateKobo,
  cleaningFeeKobo = 0,
  nights,
}: ComputeHousingPriceInput): HousingPriceBreakdown {
  let nightlyTotal = nightlyRateKobo * nights;
  let weeklyDiscount = 0;
  let monthlyDiscount = 0;

  // Apply monthly discount if applicable (≥30 nights)
  if (monthlyRateKobo && monthlyRateKobo > 0 && nights >= 30) {
    const fullMonths = Math.floor(nights / 30);
    const remainingNights = nights % 30;
    const monthlyBased = monthlyRateKobo * fullMonths + nightlyRateKobo * remainingNights;
    monthlyDiscount = nightlyTotal - monthlyBased;
    nightlyTotal = monthlyBased;
  } else if (weeklyRateKobo && weeklyRateKobo > 0 && nights >= 7) {
    const fullWeeks = Math.floor(nights / 7);
    const remainingNights = nights % 7;
    const weeklyBased = weeklyRateKobo * fullWeeks + nightlyRateKobo * remainingNights;
    weeklyDiscount = nightlyTotal - weeklyBased;
    nightlyTotal = weeklyBased;
  }

  const subtotal = nightlyTotal + cleaningFeeKobo;
  const serviceFee = Math.round((subtotal * SERVICE_FEE_PERCENT) / 100);
  const total = subtotal + serviceFee;

  return { nightlyTotal, weeklyDiscount, monthlyDiscount, cleaningFee: cleaningFeeKobo, subtotal, serviceFee, total };
}

export interface ComputeHousingMonthlyInput {
  monthlyRateKobo: number;
  leaseMonths: number;
  /** e.g. { "6": 5, "12": 10 } — percent off for that lease length */
  leaseDiscounts?: Record<string, number>;
  cleaningFeeKobo?: number;
  /** Refundable deposit — shown separately, NOT included in total. */
  depositKobo?: number;
}

/**
 * Compute the total price for a monthly lease booking — spec §41.
 */
export function computeHousingMonthlyPriceKobo({
  monthlyRateKobo,
  leaseMonths,
  leaseDiscounts = {},
  cleaningFeeKobo = 0,
  depositKobo = 0,
}: ComputeHousingMonthlyInput): HousingMonthlyBreakdown {
  const months = Math.max(1, Number(leaseMonths) || 1);
  const base = monthlyRateKobo * months;
  const discountPercent = Number(
    leaseDiscounts[String(months)] ?? leaseDiscounts[months] ?? 0
  );
  const discountKobo = discountPercent > 0 ? Math.round((base * discountPercent) / 100) : 0;
  const subtotal = base - discountKobo + cleaningFeeKobo;
  const serviceFee = Math.round((subtotal * SERVICE_FEE_PERCENT) / 100);
  const total = subtotal + serviceFee;

  return { base, months, discountPercent, discountKobo, cleaningFee: cleaningFeeKobo, depositKobo, subtotal, serviceFee, total };
}

export interface ValidateStayDurationInput {
  nights: number;
  minStayNights?: number;
  maxStayNights?: number;
}

/**
 * Validate that a requested stay meets listing min/max requirements.
 */
export function validateStayDuration({
  nights,
  minStayNights = 1,
  maxStayNights,
}: ValidateStayDurationInput): { valid: true } | { valid: false; error: string } {
  if (nights < minStayNights) {
    return {
      valid: false,
      error: `Minimum stay is ${minStayNights} night${minStayNights > 1 ? "s" : ""}`,
    };
  }
  if (maxStayNights !== undefined && nights > maxStayNights) {
    return {
      valid: false,
      error: `Maximum stay is ${maxStayNights} night${maxStayNights > 1 ? "s" : ""}`,
    };
  }
  return { valid: true };
}
