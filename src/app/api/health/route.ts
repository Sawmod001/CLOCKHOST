import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";
import { checkServiceHealth } from "@/lib/monitoring";

/**
 * GET /api/health
 * Public health check endpoint. Returns overall system status.
 */
export async function GET() {
  const checks: Record<string, { status?: string } & Record<string, unknown>> = {};

  // Database check
  const dbHealth = await checkServiceHealth("database", async () => {
    const { error } = await supabase.from("users").select("id").limit(1);
    if (error) throw error;
    return { connected: true };
  });
  checks.database = dbHealth;

  // Storage check
  const storageHealth = await checkServiceHealth("storage", async () => {
    const { error } = await (supabase as unknown as {
      storage: { listBuckets: () => Promise<{ error: unknown }> };
    }).storage.listBuckets();
    if (error) throw error;
    return { connected: true };
  });
  checks.storage = storageHealth;

  // Compute overall status
  const statuses = Object.values(checks);
  const allHealthy = statuses.every((s: { status?: string }) => s.status === "healthy");
  const anyDown = statuses.some((s: { status?: string }) => s.status === "down");

  const overallStatus = allHealthy ? "healthy" : anyDown ? "down" : "degraded";

  return ok({
    ok: overallStatus !== "down",
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
  }, overallStatus === "down" ? 503 : 200);
}
