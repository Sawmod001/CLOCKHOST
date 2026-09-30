import type { NextRequest } from "next/server";
import { parseSessionToken, verifyClerkSession } from "@/lib/auth/getSessionUser";
import { getUser } from "@/lib/auth/getUser";
import { updateUserByClerkId } from "@/lib/db/supabase-queries";
import { ok, fail, unauthorised } from "@/lib/db/supabase-utils";

export async function GET(request: NextRequest) {
  try {
    const sessionInfo = await parseSessionToken(request);
    if (!sessionInfo?.userId) return unauthorised("No session");
    const isValid = await verifyClerkSession(sessionInfo.sessionId, sessionInfo.userId);
    if (!isValid) return unauthorised("Invalid session");

    const user = await getUser(sessionInfo.userId);
    if (!user) return unauthorised("User not found");

    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role || "guest",
      providerProfile: user.providerProfile || null,
      profile: user.profile || {},
      createdAt: (user as unknown as { created_at?: string }).created_at,
    });
  } catch (error) {
    console.error("GET /api/users/me error:", error);
    return fail("Failed to fetch profile", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionInfo = await parseSessionToken(request);
    if (!sessionInfo?.userId) return unauthorised("No session");
    const isValid = await verifyClerkSession(sessionInfo.sessionId, sessionInfo.userId);
    if (!isValid) return unauthorised("Invalid session");

    const user = await getUser(sessionInfo.userId);
    if (!user) return unauthorised("User not found");

    const body = (await request.json() as Record<string, unknown>);
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name as string;
    if (body.phone !== undefined) updates.phone = body.phone as string | null;
    if (body.profile !== undefined) {
      const existing = user.profile || {};
      updates.profile = { ...existing, ...(body.profile as Record<string, unknown>) };
    }

    if (Object.keys(updates).length === 0) return fail("No fields to update", 400);

    const updatedRaw = await updateUserByClerkId(sessionInfo.userId, updates);
    const updated = updatedRaw as unknown as {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      role?: string;
      profile?: Record<string, unknown> | null;
    } | null;
    return ok({
      id: updated?.id,
      name: updated?.name,
      email: updated?.email,
      phone: updated?.phone,
      role: updated?.role || "guest",
      profile: updated?.profile || {},
    });
  } catch (error) {
    console.error("PATCH /api/users/me error:", error);
    return fail("Failed to update profile", 500);
  }
}
