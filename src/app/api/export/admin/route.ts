import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/helpers";
import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { logAudit } from "@/lib/db/audit";
import { validateCsrfOrigin } from "@/lib/csrf";

/**
 * POST /api/export/admin
 * Admin data export (listings, users, revenue).
 *
 * Body:
 *   { type: 'listings' | 'users', status?, format? }
 */
export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof Response) return adminOrResponse;
    const admin = adminOrResponse;

    const body = (await request.json()) as { type?: unknown; status?: unknown; format?: unknown };
    const { type, status, format = "csv" } = body;

    if (!type) return fail("type required (listings or users)", 400);

    if (type === "listings") {
      const { data: csv, error } = await supabase
        .rpc("export_listings_csv", { p_status: (status as string | null) || null })
        .single();

      if (error) throw error;

      await logAudit({
        actorId: admin.id,
        action: "export.listings",
        resourceType: "export",
        metadata: { status, format },
      });

      return new Response(csv as unknown as string, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="clockhost-listings-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    if (type === "users") {
      const { data: usersRaw, error } = await supabase
        .from("users")
        .select("id, full_name, email, phone, role, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const users = usersRaw as unknown as Array<{
        id: string;
        full_name?: string | null;
        email?: string | null;
        phone?: string | null;
        role?: string;
        created_at?: string;
      }> | null;

      await logAudit({
        actorId: admin.id,
        action: "export.users",
        resourceType: "export",
        metadata: { count: users?.length || 0, format },
      });

      if (format === "csv") {
        let csv = "user_id,name,email,phone,role,created_at\r\n";
        for (const u of users || []) {
          csv += `"${u.id}","${((u.full_name as string) || "").replace(/"/g, '""')}","${u.email || ""}","${u.phone || ""}","${u.role}","${u.created_at}"\r\n`;
        }
        return new Response(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="clockhost-users-${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      return ok({ ok: true, data: users });
    }

    return fail("Invalid export type", 400);
  } catch (error) {
    console.error("POST /api/export/admin error:", error);
    return fail("Failed to export data", 500);
  }
}
