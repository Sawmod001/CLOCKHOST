import type { NextRequest } from "next/server";
import { pool } from "@/lib/db/connection";

export async function GET(request: NextRequest) {
  try {
    const expected = process.env.CRON_SECRET;
    const provided = request.headers.get("authorization") || "";
    if (!expected || provided !== `Bearer ${expected}`) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await pool.query("SELECT * FROM cancel_expired_group_plans()");
    const cancelled = (result.rows[0] as { cancelled?: unknown } | undefined)?.cancelled ?? 0;
    return Response.json({ ok: true, cancelled });
  } catch (error) {
    console.error("GET /api/cron/cancel-expired-group-plans error:", error);
    return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
