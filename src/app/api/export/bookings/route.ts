import type { NextRequest } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * POST /api/export/bookings
 * Export host's bookings as CSV.
 *
 * Body:
 *   { startDate?, endDate?, format? }
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireHost(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json()) as { startDate?: unknown; endDate?: unknown; format?: unknown };
    const { startDate, endDate, format = "csv" } = body;

    if (!["csv", "json"].includes(format as string)) {
      return fail("format must be 'csv' or 'json'", 400);
    }

    if (format === "csv") {
      const { data: csv, error } = await supabase
        .rpc("export_bookings_csv", {
          p_user_id: user.id,
          p_role: user.role,
          p_start_date: (startDate as string | null) || null,
          p_end_date: (endDate as string | null) || null,
        })
        .single();

      if (error) throw error;

      await logAudit({
        actorId: user.id,
        action: "export.bookings",
        resourceType: "export",
        resourceId: user.id,
        metadata: { format, startDate, endDate },
      });

      return new Response(csv as unknown as string, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="clockhost-bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // JSON format
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        id, event_start, event_end, status, booking_type,
        total_amount_kobo, commission_kobo, paid_at, created_at,
        listing:listing_id(title, vertical),
        guest:guest_id(full_name, email)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Filter by host's listings
    const { data: listingsRaw } = await supabase
      .from("listings")
      .select("id")
      .eq("provider_profile_id", user.providerProfile?.id);

    const listings = listingsRaw as unknown as Array<{ id: string }> | null;
    const listingIds = new Set((listings || []).map((l: { id: string }) => l.id));
    const bookingsRows = bookings as unknown as Record<string, unknown>[] | null;
    const filtered = (bookingsRows || []).filter((b: Record<string, unknown>) => listingIds.has(b.listing_id as string));

    await logAudit({
      actorId: user.id,
      action: "export.bookings",
      resourceType: "export",
      resourceId: user.id,
      metadata: { format: "json", count: filtered.length },
    });

    return ok({ ok: true, data: filtered });
  } catch (error) {
    console.error("POST /api/export/bookings error:", error);
    return fail("Failed to export bookings", 500);
  }
}
