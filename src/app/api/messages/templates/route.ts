import type { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * GET /api/messages/templates
 * List message templates for the current user.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { data: templates, error } = await supabase
      .from("message_templates")
      .select("id, name, content, category, is_active, use_count, created_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("use_count", { ascending: false });

    if (error) throw error;

    return ok({ ok: true, data: templates || [] });
  } catch (error) {
    console.error("GET /api/messages/templates error:", error);
    return fail("Failed to fetch templates", 500);
  }
}

/**
 * POST /api/messages/templates
 * Create a message template.
 *
 * Body:
 *   { name, content, category? }
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const body = (await request.json() as Record<string, unknown>);
    const { name, content, category = "general" } = body;
    const nameStr = name as string | undefined;
    const contentStr = content as string | undefined;
    const categoryStr = category as string;

    if (!nameStr || !contentStr) return fail("name and content required", 400);
    if (nameStr.length > 100) return fail("name must be 100 characters or fewer", 400);
    if (contentStr.length > 5000) return fail("content must be 5000 characters or fewer", 400);

    const validCategories = ["general", "booking", "pricing", "availability", "custom"];
    if (!validCategories.includes(categoryStr as string)) {
      return fail(`category must be one of: ${validCategories.join(", ")}`, 400);
    }

    const { data: template, error } = await supabase
      .from("message_templates")
      .insert({
        user_id: user.id,
        name: (nameStr as string).trim(),
        content: (contentStr as string).trim(),
        category,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return fail("A template with this name already exists", 409);
      throw error;
    }

    return ok({ ok: true, data: template }, 201);
  } catch (error) {
    console.error("POST /api/messages/templates error:", error);
    return fail("Failed to create template", 500);
  }
}

/**
 * DELETE /api/messages/templates?id=xxx
 * Delete a message template.
 */
export async function DELETE(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const userOrResponse = await requireAuthenticatedUser(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("id");

    if (!templateId) return fail("id required", 400);

    const { error } = await supabase
      .from("message_templates")
      .delete()
      .eq("id", templateId)
      .eq("user_id", user.id);

    if (error) throw error;

    return ok({ ok: true });
  } catch (error) {
    console.error("DELETE /api/messages/templates error:", error);
    return fail("Failed to delete template", 500);
  }
}
