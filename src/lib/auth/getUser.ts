import { getClerkUser } from "@/lib/auth/getSessionUser";
import {
  findUserByClerkId,
  createUser,
  findProviderProfileByUserId,
} from "@/lib/db/supabase-queries";
import { supabase } from "@/lib/db/supabase";
import type { AppUser } from "@/types/domain";
import type { DbUser, DbProviderProfile } from "@/types/db";

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function findUserByEmail(email: string): Promise<DbUser | null> {
  const res = await supabase
    .from<DbUser>("users")
    .select()
    .eq("email", email)
    .maybeSingle();
  if (res.error) throw Object.assign(new Error(res.error.message), { code: res.error.code });
  return res.data;
}

/** Merge DB user + Clerk user + optional provider profile into an AppUser. */
function buildAppUser(
  clerkUser: NonNullable<Awaited<ReturnType<typeof getClerkUser>>>,
  dbUser: DbUser,
  providerProfile: DbProviderProfile | null
): AppUser {
  return {
    ...clerkUser,
    id: dbUser.id,
    role: (dbUser.role ?? clerkUser.role ?? "guest") as AppUser["role"],
    profile: (dbUser.profile as Record<string, unknown>) ?? {},
    phone: dbUser.phone ?? null,
    profileCompleted: dbUser.profile_completed,
    profile_completed: dbUser.profile_completed,
    providerProfile: providerProfile
      ? {
          id: providerProfile.id,
          userId: providerProfile.user_id,
          providerType: providerProfile.provider_type,
          businessName: providerProfile.business_name,
          businessType: providerProfile.business_type,
          displayName: providerProfile.display_name,
          verificationStatus: providerProfile.verification_status,
          verifiedAt: providerProfile.verified_at,
          suspensionReason: providerProfile.suspension_reason,
          createdAt: providerProfile.created_at,
          updatedAt: providerProfile.updated_at,
        }
      : null,
  };
}

/** Fetch provider profile if the user is a host, silently swallow non-fatal errors. */
async function safeGetProviderProfile(
  userId: string,
  context: string
): Promise<DbProviderProfile | null> {
  try {
    return await findProviderProfileByUserId(userId);
  } catch (err) {
    console.warn(`getUser: provider profile fetch failed for ${context}`, (err as Error)?.message);
    return null;
  }
}

function isHost(role: string): boolean {
  return role === "venue_host" || role === "shortlet_host";
}

function isTransientDbError(err: unknown): boolean {
  const msg = (err as Error)?.message ?? "";
  return /ECONN|ETIMEDOUT|ENOTFOUND|timeout/i.test(msg);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Resolve a full AppUser from a Clerk user ID.
 *
 * Strategy:
 * 1. Find existing DB user by Clerk ID.
 * 2. Fall back to matching by email (handles pre-Clerk users).
 * 3. Create a new user if neither exists.
 *
 * Throws on transient DB errors (caller should return 503).
 * Returns `null` only when user genuinely cannot be resolved.
 */
export async function getUser(clerkUserId: string): Promise<AppUser | null> {
  if (!clerkUserId) return null;

  const clerkUser = await getClerkUser(clerkUserId);
  if (!clerkUser) return null;

  // 1. Find by Clerk ID
  try {
    const dbUser = await findUserByClerkId(clerkUserId);
    if (dbUser) {
      const providerProfile = isHost(dbUser.role)
        ? await safeGetProviderProfile(dbUser.id, dbUser.id)
        : null;
      return buildAppUser(clerkUser, dbUser, providerProfile);
    }
  } catch (dbErr) {
    // Transient connection error — re-throw so caller returns 503
    if (
      (dbErr as { code?: string }).code &&
      ["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND"].some((c) =>
        (dbErr as Error).message?.includes(c)
      )
    ) {
      throw dbErr;
    }
    console.warn("getUser: findUserByClerkId failed", (dbErr as Error)?.message);
  }

  // 2. Fall back to email match
  if (clerkUser.email) {
    try {
      const existing = await findUserByEmail(clerkUser.email);
      if (existing) {
        const providerProfile = isHost(existing.role)
          ? await safeGetProviderProfile(existing.id, `email match ${existing.id}`)
          : null;
        return buildAppUser(clerkUser, existing, providerProfile);
      }
    } catch (emailErr) {
      if (isTransientDbError(emailErr)) throw emailErr;
      console.warn("getUser: findUserByEmail failed", (emailErr as Error)?.message);
    }
  }

  // 3. Create new user
  try {
    const dbUser = await createUser({
      clerk_id: clerkUserId,
      name: clerkUser.name,
      email: clerkUser.email,
      role: (clerkUser.role ?? "guest") as DbUser["role"],
      is_email_verified: true,
      email_verified_at: new Date().toISOString(),
      status: "active",
      profile_completed: clerkUser.profileCompleted,
    });
    return buildAppUser(clerkUser, dbUser, null);
  } catch (createErr) {
    // Race condition: another request created the user concurrently
    const code = (createErr as { code?: string }).code;
    const msg = (createErr as Error)?.message ?? "";
    if (code === "23505" || msg.includes("duplicate")) {
      if (clerkUser.email) {
        try {
          const existing = await findUserByEmail(clerkUser.email);
          if (existing) return buildAppUser(clerkUser, existing, null);
        } catch {
          // ignore — fall through to null
        }
      }
    }
    // Transient DB errors — re-throw so caller returns 503
    if (isTransientDbError(createErr)) throw createErr;

    console.error("getUser: createUser failed", msg);
    return null;
  }
}
