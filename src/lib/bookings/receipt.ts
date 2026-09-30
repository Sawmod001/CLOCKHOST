import type { DbBooking, DbListing, DbPricingSnapshot } from "@/types/db";
import type { BookingReceipt, ReceiptItem } from "@/types/domain";
import type { AppUser } from "@/types/domain";

interface GenerateReceiptInput {
  booking: DbBooking;
  listing: DbListing | null;
  guest: Pick<AppUser, "name" | "email"> | null;
  payment?: { ref?: string } | null;
}

/**
 * Generate a structured receipt for a confirmed booking.
 * Returns a `BookingReceipt` ready for display or export.
 */
export function generateReceipt({
  booking,
  listing,
  guest,
}: GenerateReceiptInput): BookingReceipt {
  const snapshot: Partial<DbPricingSnapshot> = booking.pricing_snapshot ?? {};
  const items: ReceiptItem[] = [];

  // Base rate line
  if ((snapshot.baseKobo ?? 0) > 0) {
    const guests = (snapshot.headcount ?? 0) > 1 ? ` × ${snapshot.headcount} guests` : "";
    items.push({
      label: `Base rate (${snapshot.hours ?? 1}h × ₦${(
        (snapshot.baseRatePerHour ?? 0) / 100
      ).toLocaleString()}/hr${guests})`,
      amountKobo: snapshot.baseKobo ?? 0,
    });
  }

  // Add-ons
  for (const addon of snapshot.addOns ?? []) {
    items.push({
      label: addon.name || "Add-on",
      amountKobo: addon.price ?? 0,
    });
  }

  // Multi-guest discount
  if ((snapshot.multiGuestDiscountKobo ?? 0) > 0) {
    items.push({
      label: `Multi-guest discount (${snapshot.multiGuestDiscountPercent}%)`,
      amountKobo: -(snapshot.multiGuestDiscountKobo ?? 0),
    });
  }

  // Hourly discount
  if ((snapshot.hourlyDiscountKobo ?? 0) > 0) {
    items.push({
      label: `Long booking discount (${snapshot.hourlyDiscountPercent}%)`,
      amountKobo: -(snapshot.hourlyDiscountKobo ?? 0),
    });
  }

  // Venue-spend discount (legacy field — kept for old snapshots)
  const venueSpendDiscountKobo =
    (snapshot as Record<string, unknown>)["venueSpendDiscountKobo"] as number | undefined;
  const venueSpendDiscountPercent =
    (snapshot as Record<string, unknown>)["venueSpendDiscountPercent"] as number | undefined;
  if (venueSpendDiscountKobo && venueSpendDiscountKobo > 0) {
    items.push({
      label: `Loyalty discount (${venueSpendDiscountPercent ?? 0}%)`,
      amountKobo: -venueSpendDiscountKobo,
    });
  }

  // Exclusive fee
  if ((snapshot.exclusiveFeeKobo ?? 0) > 0) {
    items.push({
      label: "Exclusive space fee",
      amountKobo: snapshot.exclusiveFeeKobo ?? 0,
    });
  }

  return {
    receiptId: `RCP-${booking.id.slice(0, 8).toUpperCase()}`,
    bookingId: booking.id,
    listingTitle: listing?.title ?? "Unknown listing",
    guestName: guest?.name ?? guest?.email ?? "Guest",
    guestEmail: guest?.email ?? "",
    eventStart: booking.event_start,
    eventEnd: booking.event_end,
    headcount: booking.headcount,
    bookingType: booking.booking_type,
    items,
    subtotalKobo: snapshot.totalAmountKobo ?? booking.total_amount_kobo,
    commissionKobo: snapshot.commissionKobo ?? booking.commission_kobo ?? 0,
    totalPaidKobo: booking.total_amount_kobo,
    paymentRef: booking.gateway_transaction_ref ?? "",
    paidAt: booking.paid_at ?? booking.created_at,
    status: booking.status,
    generatedAt: new Date().toISOString(),
  };
}
