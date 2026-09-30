import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clerkFetch } from "@/lib/auth/clerk";
import { parseSessionToken, verifyClerkSession } from "@/lib/auth/getSessionUser";
import {
  findUserByClerkId,
  createUser,
  updateUserByClerkId,
  findProviderProfileByUserId,
  createProviderProfile,
} from "@/lib/db/supabase-queries";
import { validateCsrfOrigin } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRedirectPath } from "@/lib/auth/redirect";
import { logAudit } from "@/lib/db/audit";
import type { UserRole, ProviderType } from "@/types/db";

const VALID_ROLES = ["guest", "venue_host", "shortlet_host"];

const MAX_LENGTHS = {
  name: 100,
  phone: 20,
  businessName: 200,
  businessType: 100,
  bio: 500,
  location: 200,
  gender: 30,
  referralSource: 100,
};

function trim(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t) return null;
  return t.slice(0, maxLen);
}

interface CompleteProfilePayload {
  role?: unknown;
  businessName?: unknown;
  businessType?: unknown;
  termsAccepted?: unknown;
  phone?: unknown;
  fullName?: unknown;
  gender?: unknown;
  location?: unknown;
  bio?: unknown;
  referralSource?: unknown;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const rateLimited = checkRateLimit(request, { windowMs: 60_000, max: 10 }, "auth:complete-profile");
    if (rateLimited) return rateLimited;

    const sessionInfo = await parseSessionToken(request);
    if (!sessionInfo?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isValid = await verifyClerkSession(sessionInfo.sessionId, sessionInfo.userId);
    if (!isValid) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const clerkId = sessionInfo.userId;
    const payload = (await request.json()) as CompleteProfilePayload;

    const selectedRole = VALID_ROLES.includes(payload?.role as string) ? (payload.role as string) : "guest";
    const isProvider = selectedRole === "venue_host" || selectedRole === "shortlet_host";

    if (isProvider) {
      if (!trim(payload?.businessName, MAX_LENGTHS.businessName)) {
        return NextResponse.json({ error: "Business name is required for provider accounts" }, { status: 400 });
      }
      if (!trim(payload?.businessType, MAX_LENGTHS.businessType)) {
        return NextResponse.json({ error: "Business type is required for provider accounts" }, { status: 400 });
      }
      if (!payload?.termsAccepted) {
        return NextResponse.json({ error: "You must accept the terms and conditions" }, { status: 400 });
      }
    }

    if (!trim(payload?.phone, MAX_LENGTHS.phone)) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    await clerkFetch(`/users/${clerkId}/metadata`, {
      method: "PATCH",
      body: JSON.stringify({
        public_metadata: {
          role: selectedRole,
          profileCompleted: true,
        },
      }),
    });

    let dbUser: Awaited<ReturnType<typeof findUserByClerkId>> = null;
    try {
      dbUser = await findUserByClerkId(clerkId);
      if (!dbUser) {
        const clerkUser = (await clerkFetch(`/users/${clerkId}`)) as {
          email_addresses?: Array<{ email_address?: string }>;
          fullName?: string;
        };
        const email = clerkUser.email_addresses?.[0]?.email_address || "";
        const name = clerkUser.fullName || email || "User";
        dbUser = await createUser({
          clerk_id: clerkId,
          name,
          email,
          role: "guest",
          is_email_verified: true,
          email_verified_at: new Date().toISOString(),
          status: "active",
          profile_completed: false,
        });
      }

      if (!dbUser) throw new Error("Failed to load user");

      const previousRole = dbUser.role;

      const existingProfile = (dbUser.profile as Record<string, unknown> | undefined) ?? {};

      const profile: Record<string, unknown> = {
        ...existingProfile,
        fullName: trim(payload?.fullName, MAX_LENGTHS.name) || (existingProfile.fullName as string | undefined) || dbUser.name,
        phone: trim(payload?.phone, MAX_LENGTHS.phone) || (existingProfile.phone as string | undefined) || null,
        gender: trim(payload?.gender, MAX_LENGTHS.gender) || (existingProfile.gender as string | undefined) || null,
        location: trim(payload?.location, MAX_LENGTHS.location) || (existingProfile.location as string | undefined) || null,
        bio: trim(payload?.bio, MAX_LENGTHS.bio) || (existingProfile.bio as string | undefined) || null,
        referralSource: trim(payload?.referralSource, MAX_LENGTHS.referralSource) || (existingProfile.referralSource as string | undefined) || null,
        termsAcceptedAt: isProvider ? new Date().toISOString() : null,
      };

      await updateUserByClerkId(clerkId, {
        role: selectedRole as UserRole,
        profile_completed: true,
        status: "active",
        phone: trim(payload?.phone, MAX_LENGTHS.phone) || dbUser.phone || null,
        profile,
      });

      await logAudit({
        actorId: dbUser.id,
        action: "profile.completed",
        resourceType: "user",
        resourceId: dbUser.id,
        metadata: { previousRole, newRole: selectedRole, isProvider },
      });

      if (previousRole !== selectedRole) {
        await logAudit({
          actorId: dbUser.id,
          action: "role.changed",
          resourceType: "user",
          resourceId: dbUser.id,
          metadata: { from: previousRole, to: selectedRole, source: "complete-profile" },
        });
      }

      if (isProvider) {
        const existingProviderProfile = await findProviderProfileByUserId(dbUser.id);
        if (!existingProviderProfile) {
          const pp = await createProviderProfile({
            user_id: dbUser.id,
            provider_type: selectedRole as ProviderType,
            business_name: trim(payload.businessName, MAX_LENGTHS.businessName),
            business_type: trim(payload.businessType, MAX_LENGTHS.businessType),
            display_name: trim(payload.businessName, MAX_LENGTHS.businessName),
            verification_status: "none",
          });

          await logAudit({
            actorId: dbUser.id,
            action: "provider_profile.created",
            resourceType: "provider_profile",
            resourceId: pp.id,
            metadata: {
              providerType: selectedRole,
              businessName: trim(payload.businessName, MAX_LENGTHS.businessName),
            },
          });
        }
      }
    } catch {
      // Supabase unavailable — Clerk metadata has all critical data
    }

    const redirectTo = getRedirectPath({ role: selectedRole as UserRole, profileCompleted: true });

    return NextResponse.json({
      ok: true,
      data: { role: selectedRole, redirectTo },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Failed to save profile" }, { status: 500 });
  }
}
