/**
 * Database row types — derived from Supabase migrations.
 * These represent exact PostgreSQL table shapes (snake_case).
 * Camel-case API types live in domain.ts.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = "guest" | "venue_host" | "shortlet_host" | "admin";

export type ProviderType = "venue_host" | "shortlet_host";

export type VerificationStatus = "none" | "pending" | "approved" | "rejected" | "suspended";

export type VerificationKind = "identity" | "business" | "property_authority";

export type VerificationState = "pending" | "approved" | "rejected" | "expired";

export type ListingStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "active"
  | "approved"
  | "rejected"
  | "suspended"
  | "archived";

export type ListingVertical = "venue" | "housing" | "outdoor_space";

export type BookingType = "capacity" | "exclusive" | "housing" | "viewing";

export type BookingStatus =
  | "pending_approval"
  | "awaiting_payment"
  | "payment_processing"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled_by_guest"
  | "cancelled_by_host"
  | "cancelled_system"
  | "expired"
  | "rejected"
  | "lost_race"
  | "viewing_pending"
  | "viewing_confirmed"
  | "viewing_cancelled"
  | "no_show";

export type CancellationPolicy = "flexible" | "moderate" | "strict" | "custom";

export type PaymentStatus = "pending" | "processing" | "successful" | "failed" | "refunded" | "disputed";

export type EscrowStatus = "held" | "released" | "refunded" | "disputed";

export type SoftHoldState = "active" | "consumed" | "released" | "expired";

export type ExclusiveLockStatus = "open" | "locked" | "reserved";

export type GroupPlanStatus = "active" | "finalized" | "cancelled";

export type PlanMemberStatus = "pending" | "paid" | "confirmed";

export type RefundReason = "guest_cancelled" | "host_cancelled" | "dispute" | "system_error" | "other";

export type RefundStatus = "pending" | "processing" | "completed" | "failed";

export type DisputeStatus = "open" | "under_review" | "resolved" | "closed";

export type ViewingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled_by_guest"
  | "cancelled_by_host"
  | "no_show";

export type NotificationChannel = "in_app" | "email" | "push";

// ─── Users ────────────────────────────────────────────────────────────────────

export interface DbUser {
  id: string;
  clerk_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: string;
  is_email_verified: boolean;
  email_verified_at: string | null;
  profile_completed: boolean;
  profile: Record<string, unknown> | null;
  avatar_url: string | null;
  bio: string | null;
  language: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

// ─── Provider Profiles ────────────────────────────────────────────────────────

export interface DbProviderProfile {
  id: string;
  user_id: string;
  provider_type: ProviderType;
  business_name: string | null;
  business_type: string | null;
  display_name: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  suspension_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Provider Verifications ───────────────────────────────────────────────────

export interface DbProviderVerification {
  id: string;
  provider_profile_id: string;
  verification_type: VerificationKind;
  status: VerificationState;
  documents: unknown[];
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Listings ─────────────────────────────────────────────────────────────────

export interface DbListingLocation {
  state: string;
  cityArea: string;
  address: string;
  coordinates?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface DbListingPricing {
  baseRatePerHour?: number;
  commissionRatePercent?: number;
  exclusiveFlatFeeKobo?: number;
  multiGuestDiscountTiers?: Array<{ minGuests: number; percent: number }>;
  hourlyDiscountTiers?: Array<{ minHours: number; percent: number }>;
  venueSpendRateKobo?: number;
  venueComponentRateKobo?: number;
  venueSpendThresholdKobo?: number;
  venueSpendDiscountPercent?: number;
  inspectionTransportFee?: number;
  // Housing-specific
  nightlyRateKobo?: number;
  weeklyRateKobo?: number;
  monthlyRateKobo?: number;
  cleaningFeeKobo?: number;
  leaseDiscounts?: Record<string, number>;
}

export interface DbListingOperationalRules {
  maxCapacity: number;
  setupTimeMinutes?: number;
  cleanupTimeMinutes?: number;
  isByobAllowed?: boolean;
  cancellationPolicy?: CancellationPolicy;
}

export interface DbListingAddOn {
  id: string;
  name: string;
  priceInKobo: number;
  isRequired: boolean;
}

export interface DbListing {
  id: string;
  provider_profile_id: string;
  vertical: ListingVertical;
  sub_vertical: string[];
  booking_type: BookingType;
  title: string;
  description: string;
  location: DbListingLocation;
  pricing: DbListingPricing;
  operational_rules: DbListingOperationalRules;
  features: Record<string, unknown>;
  media: string[];
  add_ons: DbListingAddOn[];
  status: ListingStatus;
  structured_description: DbStructuredDescription | null;
  housing_details: DbHousingDetails | null;
  search_vector: unknown | null;
  commission_rate_percent: number;
  exclusive_flat_fee_kobo: number;
  multi_guest_discount_percent: number;
  hourly_discount_tiers: unknown[];
  venue_spend_entitlement: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface DbStructuredDescription {
  highlights?: string[];
  houseRules?: string[];
  idealFor?: string[];
  gettingAround?: string;
}

export interface DbHousingDetails {
  nightlyRateKobo: number;
  weeklyRateKobo?: number;
  monthlyRateKobo?: number;
  cleaningFeeKobo?: number;
  minStayNights?: number;
  maxStayNights?: number;
  leaseDurationMonths?: number;
  checkInTime?: string;
  checkOutTime?: string;
  maxGuests?: number;
  selfCheckIn?: boolean;
  allowsPets?: boolean;
  allowsSmoking?: boolean;
  allowsParties?: boolean;
  houseRules?: string;
  viewingFeeKobo?: number;
  viewingDurationMinutes?: number;
}

// ─── Slots ────────────────────────────────────────────────────────────────────

export interface DbSlot {
  id: string;
  listing_id: string;
  event_start: string;
  event_end: string;
  capacity: number;
  booked: number;
  status: "open" | "full" | "closed";
  created_at: string;
  updated_at: string;
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export interface DbPricingSnapshot {
  baseRatePerHour: number;
  headcount: number;
  hours: number;
  baseKobo: number;
  selectedAddOnsKobo: number;
  addOns?: Array<{ id: string; name: string; price: number }>;
  multiGuestDiscountPercent: number;
  multiGuestDiscountKobo: number;
  hourlyDiscountPercent: number;
  hourlyDiscountKobo: number;
  venueSpendDiscountPercent?: number;
  venueSpendDiscountKobo?: number;
  venueSpendEntitlementKobo?: number;
  exclusiveFeeKobo: number;
  commissionRate: number;
  commissionKobo: number;
  paystackFeeKobo: number;
  totalAmountKobo: number;
  pricingRuleVersion?: string;
}

export interface DbTermsSnapshot {
  bookingType: BookingType;
  eventStart: string;
  eventEnd: string;
  headcount: number;
}

export interface DbBooking {
  id: string;
  listing_id: string;
  guest_id: string;
  host_id: string | null;
  booking_type: BookingType;
  slot_id: string | null;
  event_start: string;
  event_end: string;
  headcount: number;
  status: BookingStatus;
  total_amount_kobo: number;
  commission_kobo: number;
  pricing_snapshot: DbPricingSnapshot | null;
  pricing_snapshot_version: number;
  terms_snapshot: DbTermsSnapshot | null;
  idempotency_key: string | null;
  expires_at: string | null;
  rejection_reason: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  confirmed_at: string | null;
  check_in_token: string | null;
  check_in_token_expires_at: string | null;
  checked_in_at: string | null;
  gateway_transaction_ref: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Soft Holds ───────────────────────────────────────────────────────────────

export interface DbSoftHold {
  id: string;
  slot_id: string;
  listing_id: string;
  guest_id: string | null;
  headcount: number;
  state: SoftHoldState;
  expires_at: string;
  booking_id: string | null;
  released_at: string | null;
  created_at: string;
}

// ─── Exclusive Locks ──────────────────────────────────────────────────────────

export interface DbExclusiveLock {
  id: string;
  listing_id: string | null;
  event_start: string | null;
  event_end: string | null;
  booking_id: string | null;
  reserved_by: string | null;
  reserved_at: string | null;
  expires_at: string | null;
  status: ExclusiveLockStatus;
  created_at: string;
  updated_at: string;
}

// ─── Payment Records ──────────────────────────────────────────────────────────

export interface DbPaymentRecord {
  id: string;
  booking_id: string;
  gateway: string;
  gateway_transaction_ref: string;
  amount_kobo: number;
  net_amount_kobo: number;
  platform_fee_kobo: number;
  host_payout_kobo: number;
  gateway_fee_kobo: number;
  status: PaymentStatus;
  escrow_status: EscrowStatus;
  released_at: string | null;
  release_reason: string | null;
  currency: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface DbReview {
  id: string;
  listing_id: string;
  booking_id: string;
  reviewer_id: string;
  rating: number;
  comment: string;
  host_response: string | null;
  host_responded_at: string | null;
  is_flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Group Plans ──────────────────────────────────────────────────────────────

export interface DbGroupPlan {
  id: string;
  listing_id: string;
  slot_id: string;
  created_by: string;
  target_headcount: number;
  event_start: string;
  event_end: string;
  status: GroupPlanStatus;
  expires_at: string;
  finalized_booking_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPlanMember {
  id: string;
  plan_id: string;
  user_id: string;
  headcount: number;
  add_ons: string[];
  share_amount_kobo: number;
  status: PlanMemberStatus;
  created_at: string;
  updated_at: string;
}

// ─── Viewings ─────────────────────────────────────────────────────────────────

export interface DbViewing {
  id: string;
  listing_id: string;
  guest_id: string;
  host_id: string | null;
  booking_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: ViewingStatus;
  fee_kobo: number;
  notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface DbNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  metadata: Record<string, unknown>;
  channel: NotificationChannel;
  is_read: boolean;
  created_at: string;
}

export interface DbNotificationPreferences {
  id: string;
  user_id: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  [key: string]: unknown;
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export interface DbAuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  session_id: string | null;
  created_at: string;
}

// ─── Processed Webhooks ───────────────────────────────────────────────────────

export interface DbProcessedWebhook {
  id: string;
  gateway_transaction_ref: string;
  booking_id: string | null;
  created_at: string;
}

// ─── Disputes ─────────────────────────────────────────────────────────────────

export interface DbDispute {
  id: string;
  booking_id: string;
  opened_by: string;
  status: DisputeStatus;
  reason: string;
  description: string;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Messages / Conversations ─────────────────────────────────────────────────

export interface DbConversation {
  id: string;
  listing_id: string | null;
  booking_id: string | null;
  participant_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

// ─── Documents ────────────────────────────────────────────────────────────────

export interface DbDocument {
  id: string;
  booking_id: string;
  type: string;
  url: string;
  generated_at: string;
  created_at: string;
}

// ─── Blocked Dates ────────────────────────────────────────────────────────────

export interface DbBlockedDate {
  id: string;
  listing_id: string;
  booking_id: string | null;
  date: string;
  reason: "host_blocked" | "booking_held" | "maintenance" | "past_date" | "booking_confirmed";
  created_at: string;
}

// ─── Availability ─────────────────────────────────────────────────────────────

export interface DbAvailabilityRule {
  id: string;
  listing_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbAvailabilityException {
  id: string;
  listing_id: string;
  exception_date: string;
  is_available: boolean;
  reason: string | null;
  created_at: string;
}

// ─── Cancellation / Refunds ───────────────────────────────────────────────────

export interface DbCancellationRule {
  id: string;
  listing_id: string;
  policy: CancellationPolicy;
  free_cancellation_hours: number;
  refund_percentage: number;
  host_cancellation_penalty_hours: number;
  created_at: string;
  updated_at: string;
}

export interface DbRefundRecord {
  id: string;
  booking_id: string;
  payment_record_id: string | null;
  amount_kobo: number;
  reason: RefundReason;
  initiated_by: string | null;
  gateway_ref: string | null;
  status: RefundStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── WhatsApp Sessions ────────────────────────────────────────────────────────

export interface DbWhatsappSession {
  id: string;
  phone: string;
  state: Record<string, unknown>;
  updated_at: string;
  created_at: string;
}

// ─── Tenancy Periods ──────────────────────────────────────────────────────────

export interface DbTenancyPeriod {
  id: string;
  listing_id: string;
  booking_id: string | null;
  start_date: string;
  end_date: string;
  status: "available" | "held" | "occupied";
  created_at: string;
  updated_at: string;
}

// ─── Escrow Releases ──────────────────────────────────────────────────────────

export interface DbEscrowRelease {
  id: string;
  payment_record_id: string;
  booking_id: string;
  released_amount_kobo: number;
  platform_fee_kobo: number;
  host_payout_kobo: number;
  release_trigger: string;
  released_by: string | null;
  created_at: string;
}
