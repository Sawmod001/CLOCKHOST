import { supabase } from "./supabase";
import type {
  DbUser,
  DbProviderProfile,
  DbListing,
  DbBooking,
  DbReview,
  DbSlot,
  DbExclusiveLock,
  DbSoftHold,
  DbProviderVerification,
  DbProcessedWebhook,
} from "@/types/db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Unwrap a single-row result, throwing if the query errored. */
function unwrapSingle<T>(res: { data: T | null; error: { message: string; code?: string } | null }): T | null {
  if (res.error) throw Object.assign(new Error(res.error.message), { code: res.error.code });
  return res.data;
}

/** Unwrap a multi-row result, throwing if the query errored. */
function unwrapMany<T>(res: { data: T | null; error: { message: string; code?: string } | null }): T[] {
  if (res.error) throw Object.assign(new Error(res.error.message), { code: res.error.code });
  return (res.data as unknown as T[]) ?? [];
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function findUserByClerkId(clerkId: string): Promise<DbUser | null> {
  return unwrapSingle(
    await supabase.from<DbUser>("users").select().eq("clerk_id", clerkId).maybeSingle()
  );
}

export async function findUserById(id: string): Promise<DbUser | null> {
  return unwrapSingle(
    await supabase.from<DbUser>("users").select().eq("id", id).maybeSingle()
  );
}

export async function createUser(userData: Partial<DbUser>): Promise<DbUser> {
  const result = unwrapSingle(
    await supabase.from<DbUser>("users").insert(userData as Record<string, unknown>).select().single()
  );
  if (!result) throw new Error("User creation returned no data");
  return result;
}

export async function updateUserByClerkId(
  clerkId: string,
  updates: Partial<DbUser>
): Promise<DbUser | null> {
  return unwrapSingle(
    await supabase
      .from<DbUser>("users")
      .update(updates as Record<string, unknown>)
      .eq("clerk_id", clerkId)
      .select()
      .maybeSingle()
  );
}

export async function listUsers(filters: Partial<Record<string, unknown>> = {}): Promise<DbUser[]> {
  let query = supabase.from<DbUser>("users").select();
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  return unwrapMany(await query);
}

// ─── Provider Profiles ────────────────────────────────────────────────────────

export async function findProviderProfileByUserId(
  userId: string
): Promise<DbProviderProfile | null> {
  return unwrapSingle(
    await supabase
      .from<DbProviderProfile>("provider_profiles")
      .select()
      .eq("user_id", userId)
      .maybeSingle()
  );
}

export async function findProviderProfileById(
  id: string
): Promise<DbProviderProfile | null> {
  return unwrapSingle(
    await supabase
      .from<DbProviderProfile>("provider_profiles")
      .select()
      .eq("id", id)
      .maybeSingle()
  );
}

export async function createProviderProfile(
  profileData: Partial<DbProviderProfile>
): Promise<DbProviderProfile> {
  const result = unwrapSingle(
    await supabase
      .from<DbProviderProfile>("provider_profiles")
      .insert(profileData as Record<string, unknown>)
      .select()
      .single()
  );
  if (!result) throw new Error("Provider profile creation returned no data");
  return result;
}

export async function updateProviderProfile(
  id: string,
  updates: Partial<DbProviderProfile>
): Promise<DbProviderProfile | null> {
  return unwrapSingle(
    await supabase
      .from<DbProviderProfile>("provider_profiles")
      .update(updates as Record<string, unknown>)
      .eq("id", id)
      .select()
      .maybeSingle()
  );
}

// ─── Listings ─────────────────────────────────────────────────────────────────

export async function findListingById(id: string): Promise<DbListing | null> {
  return unwrapSingle(
    await supabase.from<DbListing>("listings").select().eq("id", id).maybeSingle()
  );
}

export async function createListing(
  listingData: Partial<DbListing>
): Promise<DbListing> {
  const result = unwrapSingle(
    await supabase
      .from<DbListing>("listings")
      .insert(listingData as Record<string, unknown>)
      .select()
      .single()
  );
  if (!result) throw new Error("Listing creation returned no data");
  return result;
}

export async function updateListing(
  id: string,
  updates: Partial<DbListing>
): Promise<DbListing | null> {
  return unwrapSingle(
    await supabase
      .from<DbListing>("listings")
      .update(updates as Record<string, unknown>)
      .eq("id", id)
      .select()
      .maybeSingle()
  );
}

export interface ListListingsOptions {
  status?: string;
  providerProfileId?: string;
  vertical?: string;
  subVertical?: string;
  bookingType?: string;
  cityArea?: string;
  keyword?: string;
  cursor?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: "asc" | "desc";
}

export async function listListings({
  status,
  providerProfileId,
  vertical,
  subVertical,
  bookingType,
  cityArea,
  keyword,
  cursor,
  limit = 50,
  offset = 0,
  orderBy = "created_at",
  orderDir = "desc",
}: ListListingsOptions = {}): Promise<DbListing[]> {
  let query = supabase.from<DbListing>("listings").select();
  if (status) query = query.eq("status", status);
  if (providerProfileId) query = query.eq("provider_profile_id", providerProfileId);
  if (vertical) query = query.eq("vertical", vertical);
  if (subVertical) query = query.contains("sub_vertical", [subVertical]);
  if (bookingType) query = query.eq("booking_type", bookingType);
  if (cityArea) query = query.eq("location->>cityArea", cityArea);
  if (keyword) {
    const pattern = `%${keyword}%`;
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`);
  }
  if (cursor) query = query.gt("created_at", cursor);
  query = query
    .order(orderBy, { ascending: orderDir === "asc" })
    .range(offset, offset + limit - 1);
  return unwrapMany(await query);
}

export async function countListings(
  filters: Partial<Record<string, unknown>> = {}
): Promise<number> {
  let query = supabase.from("listings").select("id", { count: "exact", head: true });
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  const res = await query;
  if ("count" in res) return (res as { count: number }).count;
  return 0;
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function findBookingById(id: string): Promise<DbBooking | null> {
  return unwrapSingle(
    await supabase.from<DbBooking>("bookings").select().eq("id", id).maybeSingle()
  );
}

export async function createBooking(
  bookingData: Partial<DbBooking>
): Promise<DbBooking> {
  const result = unwrapSingle(
    await supabase
      .from<DbBooking>("bookings")
      .insert(bookingData as Record<string, unknown>)
      .select()
      .single()
  );
  if (!result) throw new Error("Booking creation returned no data");
  return result;
}

export async function updateBooking(
  id: string,
  updates: Partial<DbBooking>
): Promise<DbBooking | null> {
  return unwrapSingle(
    await supabase
      .from<DbBooking>("bookings")
      .update(updates as Record<string, unknown>)
      .eq("id", id)
      .select()
      .maybeSingle()
  );
}

export interface ListBookingsOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: "asc" | "desc";
}

export async function listBookings(
  filters: Partial<Record<string, unknown>> = {},
  { limit = 50, offset = 0, orderBy = "created_at", orderDir = "desc" }: ListBookingsOptions = {}
): Promise<DbBooking[]> {
  let query = supabase.from<DbBooking>("bookings").select();
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  query = query
    .order(orderBy, { ascending: orderDir === "asc" })
    .range(offset, offset + limit - 1);
  return unwrapMany(await query);
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function listReviews(listingId: string): Promise<DbReview[]> {
  return unwrapMany(
    await supabase
      .from<DbReview>("reviews")
      .select("*")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false })
  );
}

export async function createReview(reviewData: Partial<DbReview>): Promise<DbReview> {
  const result = unwrapSingle(
    await supabase
      .from<DbReview>("reviews")
      .insert(reviewData as Record<string, unknown>)
      .select()
      .single()
  );
  if (!result) throw new Error("Review creation returned no data");
  return result;
}

export async function findReviewByBooking(bookingId: string): Promise<DbReview | null> {
  return unwrapSingle(
    await supabase
      .from<DbReview>("reviews")
      .select()
      .eq("booking_id", bookingId)
      .maybeSingle()
  );
}

// ─── Slots ────────────────────────────────────────────────────────────────────

export async function findSlotById(id: string): Promise<DbSlot | null> {
  return unwrapSingle(
    await supabase.from<DbSlot>("slots").select().eq("id", id).maybeSingle()
  );
}

export async function createSlot(slotData: Partial<DbSlot>): Promise<DbSlot> {
  const result = unwrapSingle(
    await supabase
      .from<DbSlot>("slots")
      .insert(slotData as Record<string, unknown>)
      .select()
      .single()
  );
  if (!result) throw new Error("Slot creation returned no data");
  return result;
}

export async function updateSlot(
  id: string,
  updates: Partial<DbSlot>
): Promise<DbSlot | null> {
  return unwrapSingle(
    await supabase
      .from<DbSlot>("slots")
      .update(updates as Record<string, unknown>)
      .eq("id", id)
      .select()
      .maybeSingle()
  );
}

export async function listSlots(
  filters: Partial<Record<string, unknown>> = {}
): Promise<DbSlot[]> {
  let query = supabase.from<DbSlot>("slots").select();
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  return unwrapMany(await query);
}

// ─── Exclusive Locks ──────────────────────────────────────────────────────────

export async function findExclusiveLock(id: string): Promise<DbExclusiveLock | null> {
  return unwrapSingle(
    await supabase
      .from<DbExclusiveLock>("exclusive_locks")
      .select()
      .eq("id", id)
      .maybeSingle()
  );
}

export async function createExclusiveLock(
  lockData: Partial<DbExclusiveLock>
): Promise<DbExclusiveLock> {
  const result = unwrapSingle(
    await supabase
      .from<DbExclusiveLock>("exclusive_locks")
      .insert(lockData as Record<string, unknown>)
      .select()
      .single()
  );
  if (!result) throw new Error("Exclusive lock creation returned no data");
  return result;
}

export async function updateExclusiveLock(
  id: string,
  updates: Partial<DbExclusiveLock>
): Promise<DbExclusiveLock | null> {
  return unwrapSingle(
    await supabase
      .from<DbExclusiveLock>("exclusive_locks")
      .update(updates as Record<string, unknown>)
      .eq("id", id)
      .select()
      .maybeSingle()
  );
}

export async function findExclusiveLockByListingAndTime(
  listingId: string,
  eventStart: Date
): Promise<DbExclusiveLock | null> {
  return unwrapSingle(
    await supabase
      .from<DbExclusiveLock>("exclusive_locks")
      .select()
      .eq("listing_id", listingId)
      .eq("event_start", eventStart.toISOString())
      .maybeSingle()
  );
}

// ─── Soft Holds ───────────────────────────────────────────────────────────────

export async function createSoftHold(
  holdData: Partial<DbSoftHold>
): Promise<DbSoftHold> {
  const result = unwrapSingle(
    await supabase
      .from<DbSoftHold>("soft_holds")
      .insert(holdData as Record<string, unknown>)
      .select()
      .single()
  );
  if (!result) throw new Error("Soft hold creation returned no data");
  return result;
}

export async function findSoftHoldsBySlotId(slotId: string): Promise<DbSoftHold[]> {
  return unwrapMany(
    await supabase.from<DbSoftHold>("soft_holds").select().eq("slot_id", slotId)
  );
}

// ─── Provider Verifications ───────────────────────────────────────────────────

export async function findVerificationById(
  id: string
): Promise<DbProviderVerification | null> {
  return unwrapSingle(
    await supabase
      .from<DbProviderVerification>("provider_verifications")
      .select()
      .eq("id", id)
      .maybeSingle()
  );
}

export async function listVerificationsByProviderProfile(
  providerProfileId: string
): Promise<DbProviderVerification[]> {
  return unwrapMany(
    await supabase
      .from<DbProviderVerification>("provider_verifications")
      .select("*")
      .eq("provider_profile_id", providerProfileId)
      .order("created_at", { ascending: false })
  );
}

export async function createVerification(
  verificationData: Partial<DbProviderVerification>
): Promise<DbProviderVerification> {
  const result = unwrapSingle(
    await supabase
      .from<DbProviderVerification>("provider_verifications")
      .insert(verificationData as Record<string, unknown>)
      .select()
      .single()
  );
  if (!result) throw new Error("Verification creation returned no data");
  return result;
}

export async function updateVerification(
  id: string,
  updates: Partial<DbProviderVerification>
): Promise<DbProviderVerification | null> {
  return unwrapSingle(
    await supabase
      .from<DbProviderVerification>("provider_verifications")
      .update(updates as Record<string, unknown>)
      .eq("id", id)
      .select()
      .maybeSingle()
  );
}

export async function listPendingVerifications({
  limit = 50,
  offset = 0,
}: { limit?: number; offset?: number } = {}): Promise<
  Array<DbProviderVerification & { provider_profiles: DbProviderProfile }>
> {
  return unwrapMany(
    await supabase
      .from<DbProviderVerification & { provider_profiles: DbProviderProfile }>(
        "provider_verifications"
      )
      .select(
        "*, provider_profiles!inner(id, user_id, business_name, provider_type, display_name)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1)
  );
}

export async function countPendingVerifications(): Promise<number> {
  const res = await supabase
    .from("provider_verifications")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if ("count" in res) return (res as { count: number }).count;
  return 0;
}

// ─── Processed Webhooks ───────────────────────────────────────────────────────

export async function createProcessedWebhook(
  webhookData: Partial<DbProcessedWebhook>
): Promise<DbProcessedWebhook> {
  const result = unwrapSingle(
    await supabase
      .from<DbProcessedWebhook>("processed_webhooks")
      .insert(webhookData as Record<string, unknown>)
      .select()
      .single()
  );
  if (!result) throw new Error("Processed webhook creation returned no data");
  return result;
}

export async function findProcessedWebhookByRef(
  ref: string
): Promise<DbProcessedWebhook | null> {
  return unwrapSingle(
    await supabase
      .from<DbProcessedWebhook>("processed_webhooks")
      .select()
      .eq("gateway_transaction_ref", ref)
      .maybeSingle()
  );
}
