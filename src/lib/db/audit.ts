import { supabase } from "./supabase";

export interface LogAuditParams {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Write an entry to audit_logs. Non-blocking — failures are logged but never
 * thrown, so audit logging never breaks the calling flow.
 */
export async function logAudit({
  actorId,
  action,
  resourceType,
  resourceId,
  metadata,
}: LogAuditParams): Promise<void> {
  try {
    const res = await supabase.from("audit_logs").insert({
      actor_id: actorId ?? null,
      action,
      resource_type: resourceType,
      resource_id: resourceId ?? null,
      metadata: metadata ?? {},
    });
    if ("error" in res && res.error) {
      console.error("[audit] write failed:", res.error.message);
    }
  } catch (err) {
    console.error("[audit] write failed:", (err as Error).message);
  }
}
