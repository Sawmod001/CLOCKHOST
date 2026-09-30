import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireHost } from "@/lib/auth/helpers";
import { findListingById } from "@/lib/db/supabase-queries";
import { supabase } from "@/lib/db/supabase";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { z } from "zod";

const RuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
}).refine((data) => data.startTime < data.endTime, {
  message: "Start time must be before end time",
});

const RulesBulkSchema = z.object({
  rules: z.array(RuleSchema).min(1).max(50),
});

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
 * GET /api/listings/[id]/availability-rules
 * Returns all availability rules for a listing.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { data, error } = await supabase
      .from("availability_rules")
      .select("*")
      .eq("listing_id", id)
      .order("day_of_week")
      .order("start_time");

    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("GET availability-rules error:", error);
    return NextResponse.json({ error: "Failed to load rules" }, { status: 500 });
  }
}

/**
 * PUT /api/listings/[id]/availability-rules
 * Bulk replace all rules for a listing.
 * Body: { rules: [{ dayOfWeek, startTime, endTime }, ...] }
 */
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const { id } = await context.params;
    const auth = await verifyHost(request, id);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = (await request.json() as Record<string, unknown>);
    const parsed = RulesBulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    // Delete existing rules and insert new ones
    const { error: delError } = await supabase
      .from("availability_rules")
      .delete()
      .eq("listing_id", id);
    if (delError) throw delError;

    const rows = parsed.data.rules.map((r) => ({
      listing_id: id,
      day_of_week: r.dayOfWeek,
      start_time: r.startTime,
      end_time: r.endTime,
      is_active: true,
    }));

    const { error: insError } = await (supabase.from("availability_rules").insert as unknown as (
      rows: Record<string, unknown>[] | Record<string, unknown>
    ) => Promise<{ error: unknown }>)(
      rows as unknown as Record<string, unknown>[]
    );
    if (insError) throw insError;

    await logAudit({
      actorId: (auth as unknown as { user: { id: string } }).user.id,
      action: "availability_rules.updated",
      resourceType: "listing",
      resourceId: id,
      metadata: { ruleCount: rows.length },
    });

    return NextResponse.json({ ok: true, ruleCount: rows.length });
  } catch (error) {
    console.error("PUT availability-rules error:", error);
    return NextResponse.json({ error: "Failed to update rules" }, { status: 500 });
  }
}
