import type { NextRequest } from "next/server";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { validateCsrfOrigin } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/notify/request
 * Public. Saves a name + email to the notify list. No verification.
 * Body: { name, email }.
 */
export async function POST(request: NextRequest) {
  const csrfFail = validateCsrfOrigin(request);
  if (csrfFail) return csrfFail;
  const rateLimited = checkRateLimit(request, { windowMs: 60_000, max: 5 }, "notify:request");
  if (rateLimited) return rateLimited;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";

  if (!name) return fail("Please tell us your name.", 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail("Please enter a valid email address.", 400);
  }

  const { data: existing } = await supabase
    .from("notify_signups")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("notify_signups").insert({ name, email });
    if (error) return fail("Could not save your request. Please try again.", 500);
  }

  return ok({ saved: true });
}
