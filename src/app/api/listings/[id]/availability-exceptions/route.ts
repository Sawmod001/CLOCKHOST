import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { findListingById } from "@/lib/db/supabase-queries";
import { supabase } from "@/lib/db/supabase";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { z } from "zod";

const ExceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isAvailable: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  reason: z.string().max(200).optional(),
}).refine(
  (data) => {
    if (data.isAvailable) {
      return data.startTime && data.endTime && data.startTime < data.endTime;
    }
    return true;
  },
  { message: "Available exceptions must have start and end times, with start before end" }
);

async function verifyHost(request: NextRequest, listingId: string) {
  const userOrResponse = await requireHost(request);
  if (userOrResponse instanceof Response) {
    const body = await userOrResponse.clone().json().catch(() => ({}));
    return { error: body.error || "Auth required", status: userOrResponse.status };
  }
  const user = userOrResponse;
  const listing = await findListingById(listingId);
  if (!listing) return { error: "Listing not found", status: 404 };
  if (listing.provider_profile_id !== user.providerProfile?.id) {
    return { error: "Not your listing", status: 403 };
  }
  return { user, listing };
}

/**
 * GET /api/listings/[id]/availability-exceptions?month=YYYY-MM
 * Returns all availability exceptions for a listing.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const month = url.searchParams.get("month");

    let query = supabase
      .from("availability_exceptions")
      .select("*")
      .eq("listing_id", id)
      .order("exception_date");

    if (month) {
      const startDate = `${month}-01`;
      const parts = month.split("-").map(Number);
      const y = parts[0] as number;
      const m = parts[1] as number;
      const lastDay = new Date(y, m, 0).getDate();
      const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;
      query = query.gte("exception_date", startDate).lte("exception_date", endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("GET availability-exceptions error:", error);
    return NextResponse.json({ error: "Failed to load exceptions" }, { status: 500 });
  }
}

/**
 * POST /api/listings/[id]/availability-exceptions
 * Create or update an availability exception.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const { id } = await context.params;
    const auth = await verifyHost(request, id);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = (await request.json() as Record<string, unknown>);
    const parsed = ExceptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { date, isAvailable, startTime, endTime, reason } = parsed.data;

    const row = {
      listing_id: id,
      exception_date: date,
      is_available: isAvailable,
      start_time: startTime || null,
      end_time: endTime || null,
      reason: reason || null,
    };

    const { data, error } = await (supabase.from("availability_exceptions") as unknown as {
      upsert: (
        row: Record<string, unknown>,
        opts?: Record<string, unknown>
      ) => {
        select: () => { single: () => Promise<{ data: unknown; error: unknown }> };
      };
    })
      .upsert(row, { onConflict: "listing_id,exception_date" })
      .select()
      .single();

    if (error) throw error;

    await logAudit({
      actorId: (auth as unknown as { user: { id: string } }).user.id,
      action: "availability_exception.set",
      resourceType: "listing",
      resourceId: id,
      metadata: { date, isAvailable, reason },
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("POST availability-exceptions error:", error);
    return NextResponse.json({ error: "Failed to save exception" }, { status: 500 });
  }
}

/**
 * DELETE /api/listings/[id]/availability-exceptions
 * Body: { dates: ["YYYY-MM-DD", ...] }
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const { id } = await context.params;
    const auth = await verifyHost(request, id);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = (await request.json() as Record<string, unknown>);
    const dates = body?.dates;
    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: "dates array required" }, { status: 400 });
    }

    const { data: deletedRaw, error } = await supabase
      .from("availability_exceptions")
      .delete()
      .eq("listing_id", id)
      .in("exception_date", dates as string[])
      .select("exception_date");

    if (error) throw error;

    const deleted = deletedRaw as unknown as Array<{ exception_date: string }> | null;
    await logAudit({
      actorId: (auth as unknown as { user: { id: string } }).user.id,
      action: "availability_exception.removed",
      resourceType: "listing",
      resourceId: id,
      metadata: { dates: (deleted || []).map((d: { exception_date: string }) => d.exception_date) },
    });

    return NextResponse.json({ deleted: (deleted || []).map((d: { exception_date: string }) => d.exception_date) });
  } catch (error) {
    console.error("DELETE availability-exceptions error:", error);
    return NextResponse.json({ error: "Failed to delete exceptions" }, { status: 500 });
  }
}
