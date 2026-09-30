import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { findListingById, updateListing } from "@/lib/db/supabase-queries";
import { supabase } from "@/lib/db/supabase";
import { validateListingUpdate } from "@/lib/validation";
import { validateCsrfOrigin } from "@/lib/csrf";
import { logAudit } from "@/lib/db/audit";
import { toCamelCase, ok, cachedOk, fail, notFound, forbidden, parseId } from "@/lib/db/supabase-utils";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const p = await context.params;
        const isUuid = parseId(p.id);

        try {
            if (!isUuid) return notFound("Listing not found");
            const listing = await findListingById(p.id);
            if (!listing) return notFound("Listing not found");

            // Only active listings are public. Owner and admins may view non-active.
            if (listing.status !== "active") {
                const userOrResponse = await requireAuthenticatedUser(request);
                const caller = userOrResponse instanceof Response ? null : userOrResponse;
                const isAdmin = caller ? caller.role === "admin" : false;
                const isOwner = caller?.providerProfile?.id === listing.provider_profile_id;
                if (!isAdmin && !isOwner) return notFound("Listing not found");
            }

            return cachedOk(toCamelCase(listing));
        } catch (databaseError) {
            console.error("DB fetch error:", databaseError);
            return fail("Failed to fetch listing", 500);
        }
    } catch (error) {
        console.error("GET /api/listings/[id] error:", error);
        return fail("Failed to fetch listing", 500);
    }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const csrfFail = validateCsrfOrigin(request);
        if (csrfFail) return csrfFail;

        const p = await context.params;
        const userOrResponse = await requireAuthenticatedUser(request);
        if (userOrResponse instanceof Response) return userOrResponse;
        const user = userOrResponse;

        if (!parseId(p.id)) return fail("Invalid listing ID", 400);

        const listing = await findListingById(p.id);
        if (!listing) return notFound("Listing not found");

        // Ownership check: provider must own the listing, or be admin
        const isOwner = user.providerProfile?.id === listing.provider_profile_id;
        const isAdmin = user.role === "admin";
        if (!isOwner && !isAdmin) return forbidden();

        if (["submitted", "under_review"].includes(listing.status)) {
            return fail("Cannot edit listing while under review", 400);
        }

        const payload = (await request.json() as Record<string, unknown>);

        // Reactivation: suspended/archived listings can be moved back to draft
        if (payload.action === "reactivate") {
            if (!["suspended", "archived"].includes(listing.status)) {
                return fail("Only suspended or archived listings can be reactivated", 400);
            }
            const updated = await updateListing(p.id, { status: "draft" });
            await logAudit({
                actorId: user.id,
                action: "listing.reactivated",
                resourceType: "listing",
                resourceId: p.id,
                metadata: { from_status: listing.status, to_status: "draft" },
            });
            return ok(toCamelCase(updated || { ...listing, status: "draft" }));
        }

        const validation = validateListingUpdate(payload);
        if (!validation.success) {
            const msg = validation.error.issues.map((i) => i.message).join("; ");
            return fail(msg, 400);
        }

        const updates = { ...validation.data };

        let coords;
        if (updates.location?.coordinates?.latitude != null && updates.location?.coordinates?.longitude != null) {
            coords = {
                type: "Point",
                coordinates: [updates.location.coordinates.longitude, updates.location.coordinates.latitude],
            };
        }

        const dbFields = {
            ...(updates.vertical != null && { vertical: updates.vertical }),
            ...(updates.title != null && { title: updates.title.trim() }),
            ...(updates.description != null && { description: updates.description }),
            ...(updates.media != null && { media: updates.media }),
            ...(updates.location != null && { location: { ...updates.location, ...(coords && { coordinates: coords }) } }),
            ...(updates.pricing != null && { pricing: updates.pricing }),
            ...(updates.features != null && { features: updates.features }),
            ...(updates.subVertical != null && { sub_vertical: updates.subVertical }),
            ...(updates.bookingType != null && { booking_type: updates.bookingType }),
            ...(updates.operationalRules != null && { operational_rules: updates.operationalRules }),
            ...(updates.addOns != null && { add_ons: Array.isArray(updates.addOns) ? updates.addOns : [] }),
        };

        // Clean up removed images from storage
        if (updates.media && listing.media) {
            const mediaList = updates.media as string[];
            const removedUrls = listing.media.filter((url) => !mediaList.includes(url));
            if (removedUrls.length > 0) {
                try {
                    const filePaths = removedUrls.map((url) => {
                        const path = url.split("/storage/v1/object/public/HOSTME/")[1];
                        return path;
                    }).filter(Boolean);
                    if (filePaths.length > 0) {
                        await (supabase as unknown as {
                          storage: { from: (bucket: string) => { remove: (paths: string[]) => Promise<unknown> } };
                        }).storage.from("HOSTME").remove(filePaths as string[]);
                    }
                } catch {
                    // Best-effort cleanup — don't block the update
                }
            }
        }

        const updated = await updateListing(p.id, dbFields as unknown as Parameters<typeof updateListing>[1]);

        await logAudit({
            actorId: user.id,
            action: "listing.updated",
            resourceType: "listing",
            resourceId: p.id,
            metadata: { changedFields: Object.keys(dbFields) },
        });

        return ok(toCamelCase(updated || listing));
    } catch (error) {
        console.error("PATCH /api/listings/[id] error:", error);
        return fail("Failed to update listing", 500);
    }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const csrfFail = validateCsrfOrigin(request);
        if (csrfFail) return csrfFail;

        const p = await context.params;
        const userOrResponse = await requireAuthenticatedUser(request);
        if (userOrResponse instanceof Response) return userOrResponse;
        const user = userOrResponse;

        if (!parseId(p.id)) return fail("Invalid listing ID", 400);

        const listing = await findListingById(p.id);
        if (!listing) return notFound("Listing not found");

        const isOwner = user.providerProfile?.id === listing.provider_profile_id;
        const isAdmin = user.role === "admin";
        if (!isOwner && !isAdmin) return forbidden();

        if (listing.status === "active") return fail("Deactivate listing before deleting", 400);

        // Clean up images from storage before deleting the listing
        if (listing.media?.length > 0) {
            try {
                const filePaths = listing.media.map((url) => {
                    const path = url.split("/storage/v1/object/public/HOSTME/")[1];
                    return path;
                }).filter(Boolean);
                if (filePaths.length > 0) {
                    await (supabase as unknown as {
                      storage: { from: (bucket: string) => { remove: (paths: string[]) => Promise<unknown> } };
                    }).storage.from("HOSTME").remove(filePaths as string[]);
                }
            } catch {
                // Best-effort cleanup — don't block deletion
            }
        }

        const { error: delError } = await supabase.from("listings").delete().eq("id", p.id);
        if (delError) throw delError;

        await logAudit({
            actorId: user.id,
            action: "listing.deleted",
            resourceType: "listing",
            resourceId: p.id,
            metadata: { title: listing.title, mediaCount: listing.media?.length || 0 },
        });

        return ok({ deleted: true, id: p.id });
    } catch (error) {
        console.error("DELETE /api/listings/[id] error:", error);
        return fail("Failed to delete listing", 500);
    }
}
