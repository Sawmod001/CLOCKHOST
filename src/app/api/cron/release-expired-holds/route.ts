import type { NextRequest } from "next/server";
import { pool } from "@/lib/db/connection";

export async function GET(request: NextRequest) {
  try {
    const expected = process.env.CRON_SECRET;
    const provided = request.headers.get("authorization") || "";
    if (!expected || provided !== `Bearer ${expected}`) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await pool.query("SELECT * FROM release_expired_holds()");
    const released = (result.rows[0] as { released?: unknown } | undefined)?.released ?? 0;
    return Response.json({ ok: true, released });
  } catch (error) {
    console.error("GET /api/cron/release-expired-holds error:", error);
    return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
