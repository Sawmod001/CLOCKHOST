/**
 * Domain / API types — camelCase shapes returned to the frontend.
 * Derived from DB rows via toCamelCase() or hand-assembled in route handlers.
 */

import type {
  UserRole,
  ProviderType,
  VerificationStatus,
  VerificationKind,
  VerificationState,
  ListingStatus,
  ListingVertical,
  BookingType,
  BookingStatus,
  CancellationPolicy,
  GroupPlanStatus,
  PlanMemberStatus,
  SoftHoldState,
  NotificationChannel,
  DbListingPricing,
  DbListingOperationalRules,
  DbListingAddOn,
  DbListingLocation,
  DbHousingDetails,
  DbStructuredDescription,
  DbPricingSnapshot,
  DbTermsSnapshot,
} from "./db";

// ─── Users ────────────────────────────────────────────────────────────────────

/** Full user as returned by getUser() — merged Clerk + DB data. */
export interface AppUser {
  id: string;
  clerkId?: string;
  clerk_id?: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  profileCompleted: boolean;
  profile_completed?: boolean;
  profile: Record<string, unknown>;
  avatarUrl?: string | null;
  providerProfile: AppProviderProfile | null;
}

// ─── Provider Profiles ────────────────────────────────────────────────────────

export interface AppProviderProfile {
  id: string;
  userId: string;
  providerType: ProviderType;
  businessName: string | null;
  businessType: string | null;
  displayName: string | null;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  suspensionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppProviderVerification {
  id: string;
  providerProfileId: string;
  verificationType: VerificationKind;
  status: VerificationState;
  documents: unknown[];
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Listings ─────────────────────────────────────────────────────────────────

export interface AppListing {
  id: string;
  providerProfileId: string;
  vertical: ListingVertical;
  subVertical: string[];
  bookingType: BookingType;
  title: string;
  description: string;
  location: DbListingLocation;
  pricing: DbListingPricing;
  operationalRules: DbListingOperationalRules;
  features: Record<string, unknown>;
  media: string[];
  addOns: DbListingAddOn[];
  status: ListingStatus;
  structuredDescription: DbStructuredDescription | null;
  housingDetails: DbHousingDetails | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export interface AppBooking {
  id: string;
  listingId: string;
  guestId: string;
  hostId: string | null;
  bookingType: BookingType;
  slotId: string | null;
  eventStart: string;
  eventEnd: string;
  headcount: number;
  status: BookingStatus;
  totalAmountKobo: number;
  commissionKobo: number;
  pricingSnapshot: DbPricingSnapshot | null;
  termsSnapshot: DbTermsSnapshot | null;
  idempotencyKey: string | null;
  expiresAt: string | null;
  rejectionReason: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  confirmedAt: string | null;
  checkedInAt: string | null;
  gatewayTransactionRef: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Soft Holds ───────────────────────────────────────────────────────────────

export interface AppSoftHold {
  id: string;
  slotId: string;
  listingId: string;
  guestId: string | null;
  headcount: number;
  state: SoftHoldState;
  expiresAt: string;
  bookingId: string | null;
  releasedAt: string | null;
  createdAt: string;
}

// ─── Group Plans ──────────────────────────────────────────────────────────────

export interface AppGroupPlanMember {
  id: string;
  userId: string;
  name: string;
  headcount: number;
  shareAmountKobo: number;
  status: PlanMemberStatus;
}

export interface AppGroupPlan {
  id: string;
  listingId: string;
  slotId: string;
  createdBy: string;
  targetHeadcount: number;
  eventStart: string;
  eventEnd: string;
  expiresAt: string;
  status: GroupPlanStatus;
  finalizedBookingId: string | null;
  createdAt: string;
  listing: Pick<AppListing, "id" | "title" | "bookingType" | "vertical" | "location" | "pricing" | "media" | "addOns" | "operationalRules"> | null;
  slot: { id: string; capacity: number; booked: number } | null;
  members: AppGroupPlanMember[];
  committed: number;
  remaining: number;
  paid: number;
  isMember: boolean;
  myMember: {
    id: string;
    headcount: number;
    shareAmountKobo: number;
    status: PlanMemberStatus;
  } | null;
}

export interface AppGroupPlanSummary {
  id: string;
  listingId: string;
  listingTitle: string;
  listingMedia: string | null;
  eventStart: string;
  eventEnd: string;
  targetHeadcount: number;
  committed: number;
  status: GroupPlanStatus;
  expiresAt: string;
  createdAt: string;
  finalizedBookingId: string | null;
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface AppReview {
  id: string;
  listingId: string;
  bookingId: string;
  reviewerId: string;
  rating: number;
  comment: string;
  hostResponse: string | null;
  hostRespondedAt: string | null;
  isFlagged: boolean;
  flagReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  metadata: Record<string, unknown>;
  channel: NotificationChannel;
  isRead: boolean;
  createdAt: string;
}

// ─── Pricing Breakdown ────────────────────────────────────────────────────────

export interface PricingBreakdown {
  baseRatePerHour: number;
  headcount: number;
  hours: number;
  baseKobo: number;
  selectedAddOnsKobo: number;
  multiGuestDiscountPercent: number;
  multiGuestDiscountKobo: number;
  hourlyDiscountPercent: number;
  hourlyDiscountKobo: number;
  venueSpendEntitlementKobo: number;
  venueComponentKobo: number;
  platformComponentKobo: number;
  exclusiveFeeKobo: number;
  totalAmountKobo: number;
  commissionRate: number;
  commissionKobo: number;
  paystackFeeKobo: number;
  pricingRuleVersion: string;
}

export interface HousingPriceBreakdown {
  nightlyTotal: number;
  weeklyDiscount: number;
  monthlyDiscount: number;
  cleaningFee: number;
  subtotal: number;
  serviceFee: number;
  total: number;
}

export interface HousingMonthlyBreakdown {
  base: number;
  months: number;
  discountPercent: number;
  discountKobo: number;
  cleaningFee: number;
  depositKobo: number;
  subtotal: number;
  serviceFee: number;
  total: number;
}

// ─── Receipt ─────────────────────────────────────────────────────────────────

export interface ReceiptItem {
  label: string;
  amountKobo: number;
}

export interface BookingReceipt {
  receiptId: string;
  bookingId: string;
  listingTitle: string;
  guestName: string;
  guestEmail: string;
  eventStart: string;
  eventEnd: string;
  headcount: number;
  bookingType: BookingType;
  items: ReceiptItem[];
  subtotalKobo: number;
  commissionKobo: number;
  totalPaidKobo: number;
  paymentRef: string;
  paidAt: string;
  status: BookingStatus;
  generatedAt: string;
}

// ─── Clerk / Auth ─────────────────────────────────────────────────────────────

export interface ClerkPublicMetadata {
  role?: UserRole;
  profileCompleted?: boolean;
  providerProfileId?: string;
}

export interface SessionInfo {
  userId: string;
  sessionId: string;
  payload: Record<string, unknown> & {
    sub?: string;
    user_id?: string;
    sid?: string;
    exp?: number;
    iat?: number;
    public_metadata?: ClerkPublicMetadata;
  };
}

// ─── WhatsApp Bot ─────────────────────────────────────────────────────────────

export type BotIntent = "reset" | "select" | "about" | "group_booking" | "search" | "menu";

export interface BotSessionState {
  step: "selection" | "details";
  listings?: AppListing[];
  selectedListing?: AppListing;
}

export interface BotParsedIntent {
  intent: BotIntent;
  index?: number;
}

export interface BotTextMessage {
  kind: "text";
  text: string;
}

export interface BotButton {
  id: string;
  title: string;
}

export interface BotButtonsMessage {
  kind: "buttons";
  body: string;
  buttons: BotButton[];
}

export interface BotListRow {
  id: string;
  title: string;
  description: string;
}

export interface BotListSection {
  title: string;
  rows: BotListRow[];
}

export interface BotListMessage {
  kind: "list";
  body: string;
  button: string;
  sections: BotListSection[];
}

export type BotMessage = BotTextMessage | BotButtonsMessage | BotListMessage;

export interface BotDeps {
  listActiveListings: (opts: { area?: string | null }) => Promise<AppListing[]>;
  listSlots: (listingId: string) => Promise<import("./db").DbSlot[]>;
  generateReply?: (opts: { text: string; venues: Array<{ listing: AppListing; slots: import("./db").DbSlot[] }> }) => Promise<string | null>;
  baseUrl?: string;
}

// ─── API Response Helpers ─────────────────────────────────────────────────────

export interface ApiOk<T> {
  data: T;
}

export interface ApiError {
  error: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}
