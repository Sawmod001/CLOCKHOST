import { supabase } from "@/lib/db/supabase";

/** Lightweight monitoring utilities — all functions are fire-and-forget. */

export interface RecordRequestInput {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs?: number | null;
  userId?: string | null;
}

export function recordRequest(params: RecordRequestInput): void {
  supabase
    .rpc("record_request_metric", {
      p_endpoint: params.endpoint,
      p_method: params.method,
      p_status_code: params.statusCode,
      p_response_time_ms: params.responseTimeMs ?? null,
      p_user_id: params.userId ?? null,
    })
    .then((res) => {
      if ("error" in res && res.error) {
        console.error("Failed to record request metric:", res.error.message);
      }
    })
    .catch(() => {});
}

export interface LogErrorInput {
  source: string;
  level?: "error" | "warn" | "info";
  message: string;
  stack?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export function logError(params: LogErrorInput): void {
  supabase
    .rpc("log_error", {
      p_source: params.source,
      p_level: params.level ?? "error",
      p_message: params.message,
      p_stack: params.stack ?? null,
      p_user_id: params.userId ?? null,
      p_metadata: params.metadata ?? null,
    })
    .then((res) => {
      if ("error" in res && res.error) {
        console.error("Failed to log error:", res.error.message);
      }
    })
    .catch(() => {});
}

export interface RecordHealthCheckInput {
  service: string;
  status: "healthy" | "degraded" | "down";
  responseTimeMs?: number | null;
  metadata?: Record<string, unknown> | null;
}

export function recordHealthCheck(params: RecordHealthCheckInput): void {
  supabase
    .rpc("record_health_check", {
      p_service: params.service,
      p_status: params.status,
      p_response_time_ms: params.responseTimeMs ?? null,
      p_metadata: params.metadata ?? null,
    })
    .then((res) => {
      if ("error" in res && res.error) {
        console.error("Failed to record health check:", res.error.message);
      }
    })
    .catch(() => {});
}

export interface RecordUptimeCheckInput {
  endpoint: string;
  method: string;
  expectedStatus: number;
  actualStatus: number;
  responseTimeMs: number;
}

export function recordUptimeCheck(params: RecordUptimeCheckInput): void {
  supabase
    .rpc("record_uptime_check", {
      p_endpoint: params.endpoint,
      p_method: params.method,
      p_expected_status: params.expectedStatus,
      p_actual_status: params.actualStatus,
      p_response_time_ms: params.responseTimeMs,
    })
    .then((res) => {
      if ("error" in res && res.error) {
        console.error("Failed to record uptime check:", res.error.message);
      }
    })
    .catch(() => {});
}

export interface RequestTimer {
  end: (statusCode: number, userId?: string | null) => void;
}

/** Start a request timer. Call `timer.end(statusCode)` in the response path. */
export function startTimer(request: Request): RequestTimer {
  const start = Date.now();
  const url = new URL(request.url);

  return {
    end(statusCode: number, userId?: string | null): void {
      recordRequest({
        endpoint: url.pathname,
        method: request.method,
        statusCode,
        responseTimeMs: Date.now() - start,
        userId: userId ?? null,
      });
    },
  };
}

export interface ServiceHealthResult {
  status: "healthy" | "degraded" | "down";
  responseTimeMs: number;
  error?: string;
  [key: string]: unknown;
}

/** Run a health check function and record the result. */
export async function checkServiceHealth(
  service: string,
  checkFn: () => Promise<Record<string, unknown>>
): Promise<ServiceHealthResult> {
  const start = Date.now();
  try {
    const result = await checkFn();
    const responseTimeMs = Date.now() - start;
    const status: "healthy" | "degraded" = responseTimeMs > 5_000 ? "degraded" : "healthy";

    recordHealthCheck({ service, status, responseTimeMs, metadata: result });
    return { status, responseTimeMs, ...result };
  } catch (error) {
    const responseTimeMs = Date.now() - start;
    const msg = (error as Error).message;

    recordHealthCheck({
      service,
      status: "down",
      responseTimeMs,
      metadata: { error: msg },
    });
    return { status: "down", responseTimeMs, error: msg };
  }
}
