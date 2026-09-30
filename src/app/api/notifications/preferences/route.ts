import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * GET /api/notifications/preferences
 * Get notification preferences for the current user.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    let { data: prefs } = await supabase
      .from("notification_preferences")
      .select()
      .eq("user_id", user.id)
      .maybeSingle();

    // Create default preferences if none exist
    if (!prefs) {
      const { data: newPrefs } = await supabase
        .from("notification_preferences")
        .insert({ user_id: user.id })
        .select()
        .single();
      prefs = newPrefs;
    }

    return ok({ ok: true, data: prefs });
  } catch (error) {
    console.error("GET /api/notifications/preferences error:", error);
    return fail("Failed to fetch preferences", 500);
  }
}

/**
 * PATCH /api/notifications/preferences
 * Update notification preferences.
 *
 * Body:
 *   { emailEnabled?, pushEnabled?, smsEnabled?,
 *     bookingNotifications?, paymentNotifications?,
 *     viewingNotifications?, marketingNotifications?,
 *     quietHoursStart?, quietHoursEnd? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json() as Record<string, unknown>);
    const updates: Record<string, unknown> = {};

    // Map camelCase body to snake_case DB columns
    if (body.emailEnabled !== undefined) updates.email_enabled = body.emailEnabled;
    if (body.pushEnabled !== undefined) updates.push_enabled = body.pushEnabled;
    if (body.smsEnabled !== undefined) updates.sms_enabled = body.smsEnabled;
    if (body.bookingNotifications !== undefined) updates.booking_notifications = body.bookingNotifications;
    if (body.paymentNotifications !== undefined) updates.payment_notifications = body.paymentNotifications;
    if (body.viewingNotifications !== undefined) updates.viewing_notifications = body.viewingNotifications;
    if (body.marketingNotifications !== undefined) updates.marketing_notifications = body.marketingNotifications;
    if (body.quietHoursStart !== undefined) updates.quiet_hours_start = body.quietHoursStart;
    if (body.quietHoursEnd !== undefined) updates.quiet_hours_end = body.quietHoursEnd;

    if (Object.keys(updates).length === 0) {
      return fail("No valid fields to update", 400);
    }

    // Upsert preferences
    const { data: prefs, error } = await (supabase.from("notification_preferences") as unknown as {
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

    return ok({ ok: true, data: prefs });
  } catch (error) {
    console.error("PATCH /api/notifications/preferences error:", error);
    return fail("Failed to update preferences", 500);
  }
}
