/**
 * ClockHost Enhanced Audit Library
 * Compliance logging, risk assessment, data retention management.
 */

import { supabase } from "@/lib/db/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

export const RISK_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export type RiskLevel = (typeof RISK_LEVELS)[keyof typeof RISK_LEVELS];

export const COMPLIANCE_TAGS = {
  FINANCIAL: "financial",
  PII: "pii",
  AUTH: "auth",
  DATA_ACCESS: "data_access",
  ADMIN: "admin",
} as const;

// ─── Enhanced audit logging ───────────────────────────────────────────────────

export interface LogEnhancedAuditInput {
  actorId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
}

export async function logEnhancedAudit(params: LogEnhancedAuditInput): Promise<unknown> {
  try {
    const res = await supabase.rpc("log_enhanced_audit", {
      p_actor_id: params.actorId ?? null,
      p_action: params.action,
      p_resource_type: params.resourceType,
      p_resource_id: params.resourceId ?? null,
      p_metadata: params.metadata ?? null,
      p_ip_address: params.ipAddress ?? null,
      p_user_agent: params.userAgent ?? null,
      p_request_id: params.requestId ?? null,
      p_session_id: params.sessionId ?? null,
    });
    if ("error" in res && res.error) throw new Error(res.error.message);
    return res.data;
  } catch (error) {
    console.error("[Audit] Failed to log enhanced audit:", (error as Error).message);
    return null;
  }
}

export async function getResourceAuditTrail(
  resourceType: string,
  resourceId: string,
  limit = 50
): Promise<unknown[]> {
  const res = await supabase.rpc("get_resource_audit_trail", {
    p_resource_type: resourceType,
    p_resource_id: resourceId,
    p_limit: limit,
  });
  if ("error" in res && res.error) throw new Error(res.error.message);
  return (res.data as unknown as unknown[]) ?? [];
}

export async function getComplianceReport(
  days = 30,
  tag: string | null = null
): Promise<unknown> {
  const res = await supabase.rpc("get_compliance_report", {
    p_days: days,
    p_tag: tag,
  });
  if ("error" in res && res.error) throw new Error(res.error.message);
  return res.data;
}

// ─── Request metadata extractor ───────────────────────────────────────────────

export interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
}

export function extractRequestMeta(request: Request): RequestMeta {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      null,
    userAgent: request.headers.get("user-agent") ?? null,
    requestId: request.headers.get("x-request-id") ?? null,
  };
}

// ─── withAudit middleware ─────────────────────────────────────────────────────

export interface WithAuditOptions {
  action?: string;
  resourceType?: string;
  metadata?: Record<string, unknown>;
  getActorId?: (request: Request, context: unknown) => string | null;
  getResourceId?: (request: Request, context: unknown) => string | null;
}

type RouteHandler = (request: Request, context: unknown) => Promise<Response>;

/**
 * Wrap an API route handler with automatic enhanced audit logging.
 */
export function withAudit(handler: RouteHandler, options: WithAuditOptions = {}): RouteHandler {
  return async (request: Request, context: unknown): Promise<Response> => {
    const start = Date.now();
    const meta = extractRequestMeta(request);

    try {
      const response = await handler(request, context);

      if (options.action) {
        void logEnhancedAudit({
          actorId: options.getActorId?.(request, context) ?? null,
          action: options.action,
          resourceType: options.resourceType,
          resourceId: options.getResourceId?.(request, context) ?? null,
          metadata: {
            ...options.metadata,
            method: request.method,
            url: request.url,
            status: response.status,
            duration_ms: Date.now() - start,
          },
          ...meta,
        });
      }

      return response;
    } catch (error) {
      if (options.action) {
        void logEnhancedAudit({
          actorId: options.getActorId?.(request, context) ?? null,
          action: `${options.action}.failed`,
          resourceType: options.resourceType,
          resourceId: options.getResourceId?.(request, context) ?? null,
          metadata: {
            ...options.metadata,
            method: request.method,
            url: request.url,
            error: (error as Error).message,
            duration_ms: Date.now() - start,
          },
          ...meta,
        });
      }
      throw error;
    }
  };
}

// ─── Data retention ───────────────────────────────────────────────────────────

export const dataRetention = {
  async cleanup(): Promise<unknown> {
    const res = await supabase.rpc("archive_old_data");
    if ("error" in res && res.error) throw new Error(res.error.message);
    return res.data;
  },

  async cleanupArchives(): Promise<unknown> {
    const res = await supabase.rpc("cleanup_expired_archives");
    if ("error" in res && res.error) throw new Error(res.error.message);
    return res.data;
  },

  async getPolicies(): Promise<unknown[]> {
    const res = await supabase
      .from("data_retention_policies")
      .select("*")
      .order("table_name", { ascending: true });
    if ("error" in res && res.error) throw new Error(res.error.message);
    return (res.data as unknown as unknown[]) ?? [];
  },

  async updatePolicy(id: string, updates: Record<string, unknown>): Promise<void> {
    const res = await supabase
      .from("data_retention_policies")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if ("error" in res && res.error) throw new Error(res.error.message);
  },
};

// ─── Compliance event registry ────────────────────────────────────────────────

export const COMPLIANCE_EVENTS = {
  PAYMENT_RECEIVED: { action: "payment.received", risk: "high", tags: ["financial"] },
  PAYMENT_RELEASED: { action: "payment.released", risk: "high", tags: ["financial"] },
  PAYMENT_REFUNDED: { action: "payment.refunded", risk: "high", tags: ["financial"] },
  USER_LOGIN: { action: "user.login", risk: "low", tags: ["auth"] },
  USER_LOGOUT: { action: "user.logout", risk: "low", tags: ["auth"] },
  PASSWORD_CHANGED: { action: "user.password_changed", risk: "medium", tags: ["auth"] },
  ROLE_CHANGED: { action: "user.role_changed", risk: "high", tags: ["auth", "admin"] },
  PROFILE_UPDATED: { action: "profile.updated", risk: "medium", tags: ["pii"] },
  ACCOUNT_DELETED: { action: "account.deleted", risk: "high", tags: ["pii"] },
  DATA_EXPORTED: { action: "data.exported", risk: "medium", tags: ["pii"] },
  BOOKING_CREATED: { action: "booking.created", risk: "medium", tags: [] as string[] },
  BOOKING_CANCELLED: { action: "booking.cancelled", risk: "medium", tags: [] as string[] },
  BOOKING_COMPLETED: { action: "booking.completed", risk: "low", tags: [] as string[] },
  USER_SUSPENDED: { action: "admin.user_suspended", risk: "critical", tags: ["admin"] },
  LISTING_SUSPENDED: { action: "admin.listing_suspended", risk: "high", tags: ["admin"] },
  DISPUTE_RESOLVED: { action: "admin.dispute_resolved", risk: "high", tags: ["admin"] },
} as const;
