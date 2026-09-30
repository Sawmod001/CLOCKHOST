import type { NextRequest } from "next/server";
import { parseSessionToken, verifyClerkSession } from "@/lib/auth/getSessionUser";
import { getUser } from "@/lib/auth/getUser";
import { findListingById, createExclusiveLock } from "@/lib/db/supabase-queries";
import { supabase } from "@/lib/db/supabase";
import { validateCsrfOrigin } from "@/lib/csrf";
import { toCamelCase, ok, cachedOk, fail, notFound, unauthorised, forbidden, parseId } from "@/lib/db/supabase-utils";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const csrfFail = validateCsrfOrigin(request);
        if (csrfFail) return csrfFail;

        const p = await context.params;
        const sessionInfo = await parseSessionToken(request);
        if (!sessionInfo?.userId) return unauthorised("No session");
        const isValid = await verifyClerkSession(sessionInfo.sessionId, sessionInfo.userId);
        if (!isValid) return unauthorised("Invalid session");

        const user = await getUser(sessionInfo.userId);
        if (!user) return unauthorised("User not found");

        if (!parseId(p.id)) return fail("Invalid listing ID", 400);

        const listing = await findListingById(p.id);
        if (!listing) return notFound("Listing not found");

        const isOwner = user.providerProfile?.id === listing.provider_profile_id;
        const isAdmin = user.role === "admin";
        if (!isOwner && !isAdmin) return forbidden("Not your listing");

        if (listing.booking_type !== "exclusive") return fail("Only exclusive listings support locks", 400);

        const body = (await request.json() as Record<string, unknown>);
        const { eventStart, eventEnd } = body;
        if (!eventStart || !eventEnd) return fail("Missing eventStart or eventEnd", 400);

        const start = new Date(eventStart as string);
        const end = new Date(eventEnd as string);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return fail("Invalid event date", 400);
        if (start >= end) return fail("eventStart must be before eventEnd", 400);
        if (start <= new Date()) return fail("eventStart must be in the future", 400);

        const existing = await supabase
            .from("exclusive_locks")
            .select("id")
            .eq("listing_id", p.id)
            .eq("event_start", start.toISOString())
            .maybeSingle();
        if (existing.data) return fail("A lock for this time window already exists", 409);

        const lock = await createExclusiveLock({
            listing_id: p.id,
            event_start: start.toISOString(),
            event_end: end.toISOString(),
            status: "open",
        });

        return ok(toCamelCase(lock), 201);
    } catch (error) {
        console.error("POST /api/listings/[id]/exclusive-locks error:", error);
        return fail("Failed to create exclusive lock", 500);
    }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const p = await context.params;
        const { searchParams } = new URL(request.url);
        const dateStr = searchParams.get("date");
        if (!dateStr) return fail("Missing date query parameter", 400);
        if (!parseId(p.id)) return fail("Invalid listing ID", 400);

        const listing = await findListingById(p.id);
        if (!listing) return notFound("Listing not found");
        if (listing.booking_type !== "exclusive") return fail("Listing is not exclusive", 400);

        const date = new Date(dateStr);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 86400000);

        const { data: locksRaw } = await supabase
            .from("exclusive_locks")
            .select()
            .eq("listing_id", p.id)
            .gte("event_start", dayStart.toISOString())
            .lt("event_start", dayEnd.toISOString());

        const locks = locksRaw as unknown as Record<string, unknown>[] | null;
        return cachedOk({ data: (locks || []).map(toCamelCase) });
    } catch (error) {
        console.error("GET /api/listings/[id]/exclusive-locks error:", error);
        return fail("Failed to fetch exclusive locks", 500);
    }
}
