import { supabase } from "@/lib/db/supabase";
import { ok, fail } from "@/lib/db/supabase-utils";

/**
 * GET /api/verify
 * Public endpoint to verify deployment status and database health.
 */
export async function GET() {
  try {
    // Check database connectivity
    const { error: dbError } = await supabase.from("users").select("id").limit(1);
    if (dbError) {
      return fail("Database connection failed", 503);
    }

    // Get deployment verification
    const { data: deployment, error: deployError } = await supabase
      .rpc("verify_deployment")
      .single();

    if (deployError) {
      return fail("Deployment verification failed: " + deployError.message, 500);
    }

    // Get database health
    const { data: health, error: healthError } = await supabase
      .rpc("database_health_check")
      .single();

    if (healthError) {
      return fail("Health check failed: " + healthError.message, 500);
    }

    return ok({
      ok: true,
      deployment,
      health,
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "unknown",
    });
  } catch (error) {
    console.error("GET /api/verify error:", error);
    return fail("Verification failed", 500);
  }
}
