import type { NextRequest } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * GET /api/settings/host
 * Get host settings.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    let { data: settings } = await supabase
      .from("host_settings")
      .select()
      .eq("user_id", user.id)
      .maybeSingle();

    // Create default settings if none exist
    if (!settings) {
      const { data: newSettings } = await supabase
        .from("host_settings")
        .insert({ user_id: user.id })
        .select()
        .single();
      settings = newSettings;
    }

    return ok({ ok: true, data: settings });
  } catch (error) {
    console.error("GET /api/settings/host error:", error);
    return fail("Failed to fetch host settings", 500);
  }
}

/**
 * PATCH /api/settings/host
 * Update host settings.
 *
 * Body:
 *   { autoApproveBookings?, instantBooking?, minNoticeHours?,
 *     maxAdvanceDays?, cancellationWindowHours?,
 *     defaultCancellationPolicy?, payoutMethod?,
 *     bankName?, bankAccountNumber?, bankAccountName? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json() as Record<string, unknown>);
    const updates: Record<string, unknown> = {};

    if (body.autoApproveBookings !== undefined) updates.auto_approve_bookings = body.autoApproveBookings;
    if (body.instantBooking !== undefined) updates.instant_booking = body.instantBooking;
    if (body.minNoticeHours !== undefined) updates.min_notice_hours = Math.max(0, body.minNoticeHours as number);
    if (body.maxAdvanceDays !== undefined) updates.max_advance_days = Math.max(1, body.maxAdvanceDays as number);
    if (body.cancellationWindowHours !== undefined) updates.cancellation_window_hours = body.cancellationWindowHours;
    if (body.defaultCancellationPolicy !== undefined) {
      const validPolicies = ["flexible", "moderate", "strict", "non_refundable"];
      if (!validPolicies.includes(body.defaultCancellationPolicy as string)) {
        return fail(`cancellationPolicy must be one of: ${validPolicies.join(", ")}`, 400);
      }
      updates.default_cancellation_policy = body.defaultCancellationPolicy;
    }
    if (body.payoutMethod !== undefined) updates.payout_method = body.payoutMethod;
    if (body.bankName !== undefined) updates.bank_name = body.bankName || null;
    if (body.bankAccountNumber !== undefined) updates.bank_account_number = body.bankAccountNumber || null;
    if (body.bankAccountName !== undefined) updates.bank_account_name = body.bankAccountName || null;

    if (Object.keys(updates).length === 0) {
      return fail("No valid fields to update", 400);
    }

    const { data: settings, error } = await (supabase.from("host_settings") as unknown as {
      upsert: (
        row: Record<string, unknown>,
        opts?: Record<string, unknown>
      ) => {
        select: () => { single: () => Promise<{ data: unknown; error: unknown }> };
      };
    })
      .upsert({ user_id: user.id, ...updates }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) throw error;

    return ok({ ok: true, data: settings });
  } catch (error) {
    console.error("PATCH /api/settings/host error:", error);
    return fail("Failed to update host settings", 500);
  }
}
