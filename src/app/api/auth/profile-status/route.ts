import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parseSessionToken } from "@/lib/auth/getSessionUser";
import { findUserByClerkId } from "@/lib/db/supabase-queries";

const REDIRECTS: Record<string, string> = {
  guest: "/dashboard",
  venue_host: "/host/dashboard",
  shortlet_host: "/host/dashboard",
  admin: "/admin",
};

export async function GET(request: NextRequest) {
  try {
    const sessionInfo = await parseSessionToken(request);
    if (!sessionInfo?.userId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Use local JWT parsing only — no network call to Clerk.
    // The middleware already validated the token structure and expiry.
    // Full Clerk verification happens in individual API routes that need it.

    // Check Supabase for profile completion
    try {
      const dbUser = await findUserByClerkId(sessionInfo.userId);
      if (dbUser?.profile_completed) {
        const role = dbUser.role || "guest";
        return NextResponse.json({
          authenticated: true,
          completed: true,
          redirectTo: REDIRECTS[role] || "/dashboard",
          role,
        });
      }
    } catch {
      // Supabase unavailable — fail CLOSED to profile completion. Returning
      // completed:true here used to bounce fresh sign-ups on flaky (mobile)
      // connections straight to /dashboard as guests, skipping role selection.
      // The middleware still guards protected pages, so showing the form is safe.
      return NextResponse.json({ authenticated: true, completed: false });
    }

    return NextResponse.json({ authenticated: true, completed: false });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
