import type { NextRequest } from "next/server";
import { supabase } from "@/lib/db/supabase";

/**
 * GET /api/listings/[id]/ical
 * Export listing blocked dates as iCal (.ics) format.
 * Public endpoint — no auth required.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const { data: ical, error } = await supabase
      .rpc("export_listing_ical", { p_listing_id: id })
      .single();

    if (error) throw error;
    if (!ical) {
      return new Response("Listing not found", { status: 404 });
    }

    return new Response(ical as unknown as string, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="clockhost-${id}.ics"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("GET /api/listings/[id]/ical error:", error);
    return new Response("Failed to generate calendar", { status: 500 });
  }
}
