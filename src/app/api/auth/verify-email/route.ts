import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { clerkFetch } from "@/lib/auth/clerk";
import { findUserByClerkId, updateUserByClerkId } from "@/lib/db/supabase-queries";
import { supabase } from "@/lib/db/supabase";
import { getRedirectPath } from "@/lib/auth/redirect";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateCsrfOrigin } from "@/lib/csrf";
import type { UserRole } from "@/types/db";

const MAX_ATTEMPTS = 5;

interface VerifyRow {
  code_hash: string | null;
  code_expires_at: string | null;
  attempts: number;
  verified_at: string | null;
}

/**
 * POST /api/auth/verify-email
 * Completes sign-up email ownership check. Body: { email, code }.
 * Issues the session cookie and returns redirectTo on success.
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;
    const rateLimited = checkRateLimit(request, { windowMs: 60_000, max: 10 }, "auth:verify-email");
    if (rateLimited) return rateLimited;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!email || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Enter the 6-digit code we emailed you." }, { status: 400 });
    }

    const { data } = await supabase
      .from("email_verifications")
      .select("code_hash, code_expires_at, attempts, verified_at")
      .eq("email", email)
      .maybeSingle();

    const row = data as unknown as VerifyRow | null;
    if (!row) {
      return NextResponse.json({ error: "No verification found. Please sign up again." }, { status: 404 });
    }
    if ((row.attempts ?? 0) >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: "Too many wrong attempts. Please sign up again for a new code." }, { status: 429 });
    }
    if (!row.code_hash || !row.code_expires_at || new Date(row.code_expires_at) < new Date()) {
      return NextResponse.json({ error: "This code has expired. Please sign up again." }, { status: 410 });
    }
    if (createHash("sha256").update(code).digest("hex") !== row.code_hash) {
      await supabase
        .from("email_verifications")
        .update({ attempts: (row.attempts ?? 0) + 1, updated_at: new Date().toISOString() })
        .eq("email", email);
      return NextResponse.json({ error: "That code does not match. Please try again." }, { status: 400 });
    }

    // Code valid — find the Clerk user created at sign-up.
    const lookup = (await clerkFetch(`/users?email_address=${encodeURIComponent(email)}`)) as
      | Array<{ id: string; public_metadata?: Record<string, unknown> }>
      | { data?: Array<{ id: string; public_metadata?: Record<string, unknown> }> };
    const users = Array.isArray(lookup) ? lookup : lookup.data || [];
    if (users.length === 0) {
      return NextResponse.json({ error: "Account not found. Please sign up again." }, { status: 404 });
    }
    const clerkUser = users[0] as { id: string; public_metadata?: Record<string, unknown> };

    const now = new Date().toISOString();
    await supabase
      .from("email_verifications")
      .update({ verified_at: now, code_hash: "used", updated_at: now })
      .eq("email", email);

    try {
      const dbUser = await findUserByClerkId(clerkUser.id);
      if (dbUser) {
        await updateUserByClerkId(clerkUser.id, {
          is_email_verified: true,
          email_verified_at: now,
        });
      }
    } catch {
      // Best-effort only.
    }

    const session = (await clerkFetch("/sessions", {
      method: "POST",
      body: JSON.stringify({ user_id: clerkUser.id }),
    })) as { id: string };
    const token = (await clerkFetch(`/sessions/${session.id}/tokens`, {
      method: "POST",
      body: JSON.stringify({}),
    })) as { jwt: string };

    const meta = clerkUser.public_metadata || {};
    const redirectTo = getRedirectPath({
      role: ((meta.role as string) || "guest") as UserRole,
      profileCompleted: (meta.profileCompleted as boolean) || false,
    });

    const response = NextResponse.json({ success: true, redirectTo });
    response.cookies.set("__session", token.jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    const err = error as { status?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Could not verify your email." },
      { status: err.status || 400 }
    );
  }
}
