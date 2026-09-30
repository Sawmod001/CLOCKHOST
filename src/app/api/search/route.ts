import type { NextRequest } from "next/server";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/search
 * Full-text search for listings with filters, proximity, and autocomplete.
 *
 * Query params:
 *   ?q=search term           — full-text search query
 *   ?vertical=venue|housing  — filter by vertical
 *   ?bookingType=capacity|exclusive — filter by booking type
 *   ?cityArea=Lekki          — filter by city area (partial match)
 *   ?subVertical=birthday    — filter by sub-vertical
 *   ?minPrice=1000           — minimum price per hour (kobo)
 *   ?maxPrice=50000          — maximum price per hour (kobo)
 *   ?lat=6.5244              — latitude for proximity search
 *   ?lng=3.3792              — longitude for proximity search
 *   ?radiusKm=50             — search radius in km (default 50)
 *   ?limit=20                — results per page
 *   ?offset=0                — pagination offset
 *   ?autocomplete=true       — return autocomplete suggestions instead
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimited = checkRateLimit(request, { windowMs: 60_000, max: 60 }, "search");
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(request.url);
    const isAutocomplete = searchParams.get("autocomplete") === "true";
    const query = searchParams.get("q") || null;
    const vertical = searchParams.get("vertical") || null;
    const bookingType = searchParams.get("bookingType") || null;
    const cityArea = searchParams.get("cityArea") || null;
    const subVertical = searchParams.get("subVertical") || null;
    const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : null;
    const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : null;
    const lat = searchParams.get("lat") ? Number(searchParams.get("lat")) : null;
    const lng = searchParams.get("lng") ? Number(searchParams.get("lng")) : null;
    const radiusKm = searchParams.get("radiusKm") ? Number(searchParams.get("radiusKm")) : 50;
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    // Autocomplete mode
    if (isAutocomplete) {
      if (!query || query.length < 2) {
        return ok({ ok: true, data: [] });
      }

      const { data: suggestions, error } = await supabase
        .rpc("search_autocomplete", {
          p_query: query,
          p_limit: limit,
        });

      if (error) throw error;

      return ok({ ok: true, data: suggestions || [] });
    }

    // Full search mode
    const { data: results, error } = await supabase
      .rpc("search_listings", {
        p_query: query,
        p_vertical: vertical,
        p_booking_type: bookingType,
        p_city_area: cityArea,
        p_sub_vertical: subVertical,
        p_min_price: minPrice,
        p_max_price: maxPrice,
        p_lat: lat,
        p_lng: lng,
        p_radius_km: radiusKm,
        p_limit: limit,
        p_offset: offset,
      });

    if (error) throw error;

    // Log search analytics (fire and forget)
    const analyticsPayload = {
      query: query || "",
      filters: {
        vertical,
        bookingType,
        cityArea,
        subVertical,
        minPrice,
        maxPrice,
        lat,
        lng,
        radiusKm,
      },
      results_count: results?.length || 0,
    };

    // Don't await — fire and forget, but catch unhandled rejections
    (supabase.from("search_analytics").insert(analyticsPayload) as unknown as Promise<unknown>).then(() => {}).catch(() => {});

    return ok({
      ok: true,
      data: results || [],
      meta: {
        query,
        limit,
        offset,
        count: results?.length || 0,
      },
    });
  } catch (error) {
    console.error("GET /api/search error:", error);
    return fail("Failed to search listings", 500);
  }
}
