import { supabase } from "../db/supabase";

export interface SweepResult {
  released: number;
}

/**
 * Release all expired soft holds via the `release_expired_holds` DB function.
 * Called from the `/api/cron` route on a schedule.
 */
export async function sweepExpiredHolds(): Promise<SweepResult> {
  const res = await supabase.rpc("release_expired_holds");
  if ("error" in res && res.error) {
    console.error("[sweepExpiredHolds] Error:", res.error);
    return { released: 0 };
  }
  const rows = res.data as Array<{ released?: number }> | null;
  return { released: rows?.[0]?.released ?? 0 };
}
