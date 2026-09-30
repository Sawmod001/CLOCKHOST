import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { findUserByClerkId, createUser, updateUserByClerkId } from "@/lib/db/supabase-queries";
import { clerkFetch } from "@/lib/auth/clerk";
import { validateCsrfOrigin } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/db/audit";

interface ClerkUserLike {
  id: string;
  public_metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const rateLimited = checkRateLimit(request, { windowMs: 60_000, max: 5 }, "auth:admin-setup");
    if (rateLimited) return rateLimited;

    const expected = process.env.ADMIN_SETUP_SECRET;
    const provided = request.headers.get("x-admin-setup-token");
    if (!expected || !provided || provided !== expected) {
      return NextResponse.json({ error: "Setup is locked. This action is not permitted." }, { status: 403 });
    }

    try {
      const allResp = (await clerkFetch("/users?limit=100")) as ClerkUserLike[] | { data?: ClerkUserLike[] };
      const allUsers = Array.isArray(allResp) ? allResp : (allResp.data || []);
      const existingAdmin = allUsers.some((u) => (u.public_metadata?.role as string | undefined) === "admin");
      if (existingAdmin) {
        return NextResponse.json({ error: "An admin already exists. Use /sign-in to access the portal." }, { status: 409 });
      }
    } catch (lookupErr) {
      console.error("[admin-setup] Admin lookup failed, refusing to proceed", lookupErr);
      return NextResponse.json({ error: "Could not verify admin status. Please retry later." }, { status: 503 });
    }

    const { email, password, name } = (await request.json()) as { email?: unknown; password?: unknown; name?: unknown };
    if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Email, password, and name are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return NextResponse.json({
        error: "Password must include uppercase, lowercase, a number, and a special character (e.g. Admin@1234).",
      }, { status: 400 });
    }

    const existingResp = (await clerkFetch(`/users?email_address=${encodeURIComponent(email.trim())}`)) as ClerkUserLike[] | { data?: ClerkUserLike[] };
    const existingUsers = Array.isArray(existingResp) ? existingResp : (existingResp.data || []);
    if (existingUsers.length > 0) {
      const existing = existingUsers[0] as ClerkUserLike;
      const existingMeta = existing.public_metadata || {};

      if (existingMeta.role === "admin") {
        return NextResponse.json({ error: "An admin user with this email already exists." }, { status: 409 });
      }

      await clerkFetch(`/users/${existing.id}/metadata`, {
        method: "PATCH",
        body: JSON.stringify({
          public_metadata: {
            role: "admin",
            profileCompleted: true,
          },
        }),
      });

      try {
        let user = await findUserByClerkId(existing.id);
        if (user) {
          await updateUserByClerkId(existing.id, {
            role: "admin",
            profile_completed: true,
          });
          await logAudit({
            actorId: user.id,
            action: "role.changed",
            resourceType: "user",
            resourceId: user.id,
            metadata: { from: user.role, to: "admin", source: "admin-setup" },
          });
        } else {
          user = await createUser({
            clerk_id: existing.id,
            name: name.trim(),
            email: email.trim(),
            role: "admin",
            profile_completed: true,
            is_email_verified: true,
            email_verified_at: new Date().toISOString(),
            status: "active",
          });
          await logAudit({
            actorId: user.id,
            action: "admin.created",
            resourceType: "user",
            resourceId: user.id,
            metadata: { email: email.trim(), source: "admin-setup" },
          });
        }
      } catch (dbError) {
        console.error("[admin-setup] DB unavailable, saved Clerk metadata only", dbError);
      }

      return NextResponse.json({ success: true, message: "Existing user promoted to admin." });
    }

    const clerkUser = (await clerkFetch("/users", {
      method: "POST",
      body: JSON.stringify({ email_address: [email.trim()], password }),
    })) as ClerkUserLike;

    await clerkFetch(`/users/${clerkUser.id}/metadata`, {
      method: "PATCH",
      body: JSON.stringify({
        public_metadata: { role: "admin", profileCompleted: true },
      }),
    });

    try {
      const newUser = await createUser({
        clerk_id: clerkUser.id,
        name: name.trim(),
        email: email.trim(),
        role: "admin",
        profile_completed: true,
        is_email_verified: true,
        email_verified_at: new Date().toISOString(),
        status: "active",
      });
      await logAudit({
        actorId: newUser.id,
        action: "admin.created",
        resourceType: "user",
        resourceId: newUser.id,
        metadata: { email: email.trim(), source: "admin-setup" },
      });
    } catch (dbError) {
      console.error("[admin-setup] DB unavailable, saved Clerk metadata only", dbError);
    }

    return NextResponse.json({
      success: true,
      message: "Admin user created. Sign in at /sign-in with the email and password you provided.",
    });
  } catch (error) {
    console.error("[admin-setup] Error:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to create admin user." }, { status: 500 });
  }
}
