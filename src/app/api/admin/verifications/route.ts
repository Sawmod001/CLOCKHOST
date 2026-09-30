import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/helpers";
import { listPendingVerifications, countPendingVerifications } from "@/lib/db/supabase-queries";
import { validateCsrfOrigin } from "@/lib/csrf";

void validateCsrfOrigin;

interface ProviderProfileRef {
  user_id?: string;
  [key: string]: unknown;
}

interface VerificationRow {
  provider_profiles?: (ProviderProfileRef & Record<string, unknown>) | null;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof Response) return userOrResponse;
    const user = userOrResponse;

    void user;

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const status = url.searchParams.get("status") || "pending";

    let verifications: VerificationRow[];
    let total: number;

    if (status === "pending") {
      verifications = (await listPendingVerifications({ limit, offset })) as unknown as VerificationRow[];
      total = await countPendingVerifications();
    } else {
      // For non-pending, query directly with service_role
      const { supabaseAdmin } = await import("@/lib/db/supabase-admin");
      if (!supabaseAdmin) {
        return NextResponse.json({ error: "Service role not configured" }, { status: 500 });
      }

      const { data, error, count } = await supabaseAdmin
        .from("provider_verifications")
        .select("*, provider_profiles!inner(id, user_id, business_name, provider_type, display_name)", { count: "exact" })
        .eq("status", status)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      verifications = (data || []) as unknown as VerificationRow[];
      total = count || 0;
    }

    // Fetch user emails for each verification
    const { supabaseAdmin } = await import("@/lib/db/supabase-admin");
    const userIds = [...new Set(verifications.map((v) => v.provider_profiles?.user_id).filter(Boolean))] as string[];
    let userMap: Record<string, unknown> = {};

    if (userIds.length > 0 && supabaseAdmin) {
      const { data: usersData } = await supabaseAdmin
        .from("users")
        .select("id, email, name")
        .in("id", userIds);
      if (usersData) {
        userMap = Object.fromEntries(usersData.map((u: { id: string } & Record<string, unknown>) => [u.id, u]));
      }
    }

    const enriched = verifications.map((v) => ({
      ...v,
      provider_profiles: {
        ...v.provider_profiles,
        user: (userMap[v.provider_profiles?.user_id ?? ""] as Record<string, unknown> | undefined) || null,
      },
    }));

    return NextResponse.json({ data: enriched, total });
  } catch (error) {
    console.error("GET /api/admin/verifications error:", error);
    return NextResponse.json({ error: "Failed to load verifications" }, { status: 500 });
  }
}
