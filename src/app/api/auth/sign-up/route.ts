import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { clerkFetch } from "@/lib/auth/clerk";
import { createUser } from "@/lib/db/supabase-queries";
import { supabase } from "@/lib/db/supabase";
import { getRedirectPath } from "@/lib/auth/redirect";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { isEmailConfigured, sendVerificationCode } from "@/lib/email";
import type { UserRole } from "@/types/db";

interface ClerkUserLike {
  id: string;
  public_metadata?: Record<string, unknown>;
}

interface ClerkErrorLike extends Error {
  status?: number;
  errors?: Array<{ code?: string; message?: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const rateLimited = checkRateLimit(request, { windowMs: 60_000, max: 5 }, "auth:signup");
    if (rateLimited) return rateLimited;

    const { email, password } = (await request.json()) as { email?: unknown; password?: unknown };
    const trimmedEmail = typeof email === "string" ? email.trim() : "";

    if (!trimmedEmail || typeof password !== "string" || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    let clerkUser: ClerkUserLike;

    try {
      const name = trimmedEmail.split("@")[0] || "User";
      clerkUser = (await clerkFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          email_address: [trimmedEmail],
          password,
          first_name: name,
          last_name: "",
        }),
      })) as ClerkUserLike;
    } catch (createErr) {
      const typedErr = createErr as ClerkErrorLike;
      const isDuplicate = typedErr.errors?.some(
        (e) => e.code === "duplicate_email" || e.code === "form_identifier_exists" || e.message?.toLowerCase().includes("already in use")
      );
      if (isDuplicate) {
        let found: ClerkUserLike | null = null;
        const variants = [...new Set([trimmedEmail.toLowerCase(), trimmedEmail])];
        for (const variant of variants) {
          try {
            const resp = (await clerkFetch(`/users?email_address=${encodeURIComponent(variant)}`)) as ClerkUserLike[] | { data?: ClerkUserLike[] };
            const users = Array.isArray(resp) ? resp : (resp.data || []);
            if (users.length > 0) { found = users[0] as ClerkUserLike; break; }
          } catch (lookupErr) {
            const status = (lookupErr as { status?: number }).status;
            if (status === 503 || status === 500) throw lookupErr;
          }
        }
        if (!found) {
          return NextResponse.json({ error: "Account exists but could not be found. Try signing in." }, { status: 409 });
        }
        clerkUser = found;
        const verifyRes = (await clerkFetch(`/users/${clerkUser.id}/verify_password`, {
          method: "POST",
          body: JSON.stringify({ password }),
        })) as { verified?: boolean };
        if (!verifyRes.verified) {
          return NextResponse.json({ error: "An account with this email already exists but the password is incorrect." }, { status: 409 });
        }
      } else {
        throw createErr;
      }
    }

    // Try to create Supabase user record (best-effort, never blocks)
    try {
      await createUser({
        clerk_id: clerkUser!.id,
        name: trimmedEmail.split("@")[0] || "User",
        email: trimmedEmail,
        role: "guest",
        is_email_verified: false,
        status: "active",
        profile_completed: false,
      });
    } catch {
      // Supabase unavailable — profile will be saved on complete-profile
    }

    // Email ownership check: no session is issued until the code is verified.
    // Fallback while Brevo keys are unset: issue the session directly (pre-verification behavior).
    if (!isEmailConfigured()) {
      const session = (await clerkFetch("/sessions", {
        method: "POST",
        body: JSON.stringify({ user_id: clerkUser!.id }),
      })) as { id: string };
      const token = (await clerkFetch(`/sessions/${session.id}/tokens`, {
        method: "POST",
        body: JSON.stringify({}),
      })) as { jwt: string };
      const meta = clerkUser!.public_metadata || {};
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
    }

    const code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const codeHash = createHash("sha256").update(code).digest("hex");
    const normalizedEmail = trimmedEmail.toLowerCase();

    const { data: existingCode } = await supabase
      .from("email_verifications")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingCode) {
      const { error } = await supabase
        .from("email_verifications")
        .update({
          code_hash: codeHash,
          code_expires_at: expiresAt,
          attempts: 0,
          verified_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("email", normalizedEmail);
      if (error) {
        return NextResponse.json({ error: "Could not start verification. Please try again." }, { status: 500 });
      }
    } else {
      const { error } = await supabase.from("email_verifications").insert({
        email: normalizedEmail,
        code_hash: codeHash,
        code_expires_at: expiresAt,
        attempts: 0,
      });
      if (error) {
        return NextResponse.json({ error: "Could not start verification. Please try again." }, { status: 500 });
      }
    }

    try {
      await sendVerificationCode(
        normalizedEmail,
        trimmedEmail.split("@")[0] || "there",
        code
      );
    } catch (error) {
      console.error("sign-up verification email failed:", (error as Error).message);
      return NextResponse.json(
        { error: "We could not send the verification email. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, needsVerification: true });
  } catch (error) {
    const err = error as { status?: number; message?: string };
    const status = err.status || 400;
    // Surface service-unavailable as 503 so client can show retry guidance
    if (status === 503 || status === 500) {
      return NextResponse.json({ error: err.message || "Authentication service temporarily unavailable. Please try again." }, { status });
    }
    return NextResponse.json({ error: err.message || "Could not create account." }, { status });
  }
}
