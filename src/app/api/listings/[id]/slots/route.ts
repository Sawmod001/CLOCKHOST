import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { findListingById } from "@/lib/db/supabase-queries";
import { supabase } from "@/lib/db/supabase";

/**
 * GET /api/listings/[id]/slots?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Returns generated availability slots for a listing over a date range.
 * Public endpoint — guests need this to see what's available.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const listing = await findListingById(id);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json({ error: "start and end query params required (YYYY-MM-DD)" }, { status: 400 });
    }

    // Get availability rules
    const { data: rulesRaw } = await supabase
      .from("availability_rules")
      .select("*")
      .eq("listing_id", id)
      .eq("is_active", true);

    const rules = rulesRaw as unknown as Array<Record<string, unknown> & { day_of_week?: number; start_time?: string; end_time?: string }> | null;

    // Get exceptions in range
    const { data: exceptionsRaw } = await supabase
      .from("availability_exceptions")
      .select("*")
      .eq("listing_id", id)
      .gte("exception_date", start)
      .lte("exception_date", end);

    const exceptions = exceptionsRaw as unknown as Array<Record<string, unknown> & { exception_date?: string }> | null;

    // Get blocked dates in range
    const { data: blockedRaw } = await supabase
      .from("blocked_dates")
      .select("blocked_date")
      .eq("listing_id", id)
      .gte("blocked_date", start)
      .lte("blocked_date", end);

    const blocked = blockedRaw as unknown as Array<Record<string, unknown> & { blocked_date?: string }> | null;

    // Get existing bookings in range
    const { data: bookingsRaw } = await supabase
      .from("bookings")
      .select("event_start, event_end, status")
      .eq("listing_id", id)
      .in("status", ["confirmed", "awaiting_payment"])
      .lt("event_start", end + "T23:59:59")
      .gt("event_end", start + "T00:00:00");

    const bookings = bookingsRaw as unknown as Array<Record<string, unknown> & { event_start?: string; event_end?: string }> | null;

    // Get slot config from operational_rules
    const rules_ = (listing.operational_rules || {}) as unknown as Record<string, unknown>;
    const slotDuration = (rules_.slot_duration_minutes as number) || 60;
    const bufferBefore = (rules_.buffer_before_minutes as number) || 0;
    const bufferAfter = (rules_.buffer_after_minutes as number) || 0;

    // Build blocked date set
    const blockedSet = new Set((blocked || []).map((b: Record<string, unknown> & { blocked_date?: string }) => b.blocked_date));

    // Build exception map
    const exceptionMap = new Map<string, Record<string, unknown> & { is_available?: boolean; start_time?: string; end_time?: string }>();
    for (const exc of (exceptions || []) as Array<Record<string, unknown> & { exception_date?: string }> ) {
      exceptionMap.set(exc.exception_date as string, exc as Record<string, unknown> & { is_available?: boolean; start_time?: string; end_time?: string });
    }

    // Build existing bookings for conflict check
    const bookingRanges = (bookings || []).map((b: Record<string, unknown> & { event_start?: string; event_end?: string }) => ({
      start: new Date(b.event_start as string),
      end: new Date(b.event_end as string),
    }));

    // Generate slots
    const slots: Array<Record<string, unknown>> = [];
    const currentDate = new Date(start + "T00:00:00");
    const endDate = new Date(end + "T23:59:59");

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().slice(0, 10);
      const dayOfWeek = currentDate.getDay(); // 0=Sunday

      // Check exception first
      const exception = exceptionMap.get(dateStr);
      if (exception) {
        if (exception.is_available && exception.start_time && exception.end_time) {
          // Generate slots from exception hours
          generateSlotsForRange(slots, dateStr, exception.start_time as string, exception.end_time as string, slotDuration, bufferBefore, bufferAfter, bookingRanges);
        }
        // If not available, skip this date
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Check blocked
      if (blockedSet.has(dateStr as string)) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Check recurring rules
      const dayRules = (rules || []).filter((r: Record<string, unknown> & { day_of_week?: number; start_time?: string; end_time?: string }) => r.day_of_week === dayOfWeek);
      for (const rule of dayRules) {
        generateSlotsForRange(slots, dateStr, rule.start_time as string, rule.end_time as string, slotDuration, bufferBefore, bufferAfter, bookingRanges);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({ data: slots });
  } catch (error) {
    console.error("GET slots error:", error);
    return NextResponse.json({ error: "Failed to generate slots" }, { status: 500 });
  }
}

function generateSlotsForRange(slots: Array<Record<string, unknown>>, dateStr: string, startTime: string, endTime: string, durationMinutes: number, bufferBefore: number, bufferAfter: number, bookingRanges: Array<{ start: Date; end: Date }>): void {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  let current = new Date(`${dateStr}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00`);
  const rangeEnd = new Date(`${dateStr}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`);

  while (current.getTime() + durationMinutes * 60000 <= rangeEnd.getTime()) {
    const slotStart = new Date(current);
    const slotEnd = new Date(current.getTime() + durationMinutes * 60000);

    // Apply buffer: slot must start after buffer_before from any existing booking end
    // and end before buffer_after from any existing booking start
    const isBlocked = bookingRanges.some((b: { start: Date; end: Date }) => {
      const bufferedStart = new Date(b.end.getTime() + bufferBefore * 60000);
      const bufferedEnd = new Date(b.start.getTime() - bufferAfter * 60000);
      return slotStart < bufferedEnd && slotEnd > bufferedStart;
    });

    slots.push({
      date: dateStr,
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      available: !isBlocked,
    });

    current = new Date(current.getTime() + durationMinutes * 60000);
  }
}
