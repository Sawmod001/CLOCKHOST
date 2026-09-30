/**
 * ClockHost Security Utilities
 * Input sanitization, XSS prevention, CSP headers.
 */

import { NextResponse } from "next/server";

// ─── String sanitization ──────────────────────────────────────────────────────

/** Encode HTML special characters to prevent XSS. */
export function sanitizeHtml(input: unknown): unknown {
  if (typeof input !== "string") return input;
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/** Strip all HTML tags from a string. */
export function stripHtml(input: unknown): unknown {
  if (typeof input !== "string") return input;
  return input.replace(/<[^>]*>/g, "");
}

/** Escape SQL special characters (defense-in-depth; parameterized queries are primary). */
export function sanitizeInput(input: unknown): unknown {
  if (typeof input !== "string") return input;
  return input
    .trim()
    .replace(/'/g, "''")
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/** Validate and normalize a URL. Only allows http/https. Returns `null` if invalid. */
export function sanitizeUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Normalize and validate an email address. Returns `null` if invalid. */
export function sanitizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

/** Normalize a Nigerian phone number. Returns `null` if unrecognized. */
export function sanitizePhone(phone: unknown): string | null {
  if (typeof phone !== "string") return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) return "+" + digits;
  if (digits.startsWith("0") && digits.length === 11) return "+234" + digits.slice(1);
  return null;
}

// ─── CSP & security headers ───────────────────────────────────────────────────

/** Generate the Content-Security-Policy header value. */
export function generateCSP(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co https://api.paystack.co https://www.google-analytics.com",
    "frame-src 'self' https://js.paystack.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];
  return directives.join("; ");
}

export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(self)",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

/** Apply security headers to an existing NextResponse. */
export function withSecurityHeaders(response: Response): NextResponse {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  headers.set("Content-Security-Policy", generateCSP());
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ─── Attack detection ─────────────────────────────────────────────────────────

export type ThreatType =
  | "sql_injection"
  | "xss_script"
  | "xss_javascript"
  | "xss_event_handler"
  | "path_traversal"
  | "command_injection"
  | "ldap_injection";

export interface AttackDetectionResult {
  safe: boolean;
  threats: ThreatType[];
}

export function detectAttacks(input: unknown): AttackDetectionResult {
  if (typeof input !== "string") return { safe: true, threats: [] };
  const threats: ThreatType[] = [];

  if (/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b)/i.test(input)) {
    threats.push("sql_injection");
  }
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i.test(input)) {
    threats.push("xss_script");
  }
  if (/javascript:/i.test(input)) threats.push("xss_javascript");
  if (/on\w+\s*=/i.test(input)) threats.push("xss_event_handler");
  if (/\.\.[/\\]/.test(input)) threats.push("path_traversal");
  if (/[;&|`$]/.test(input)) threats.push("command_injection");
  if (/[()&|!]/.test(input) && /ldap/i.test(input)) threats.push("ldap_injection");

  return { safe: threats.length === 0, threats };
}

// ─── Generic input validator ──────────────────────────────────────────────────

export interface FieldRule {
  type: "string" | "number";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  sanitize?: boolean;
}

export type ValidationSchema = Record<string, FieldRule>;

export interface ValidationError {
  field: string;
  message: string;
  threats?: ThreatType[];
}

/**
 * Validate and sanitize a raw data object against a schema.
 * Throws `{ type: "validation", errors }` on failure, returns sanitized data on success.
 */
export function validateInput(
  data: Record<string, unknown>,
  schema: ValidationSchema
): Record<string, unknown> {
  const errors: ValidationError[] = [];
  const sanitized: Record<string, unknown> = {};

  for (const [field, rules] of Object.entries(schema)) {
    let value = data[field];

    if (rules.required && (value === undefined || value === null || value === "")) {
      errors.push({ field, message: `${field} is required` });
      continue;
    }
    if (!rules.required && (value === undefined || value === null || value === "")) continue;

    if (rules.type === "string" && typeof value !== "string") {
      errors.push({ field, message: `${field} must be a string` });
      continue;
    }
    if (rules.type === "number" && typeof value !== "number") {
      errors.push({ field, message: `${field} must be a number` });
      continue;
    }

    if (rules.type === "string" && typeof value === "string") {
      let str: string = value;
      str = str.trim();
      if (rules.minLength && str.length < rules.minLength) {
        errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
      }
      if (rules.maxLength && str.length > rules.maxLength) {
        errors.push({ field, message: `${field} must be at most ${rules.maxLength} characters` });
      }
      if (rules.pattern && !rules.pattern.test(str)) {
        errors.push({ field, message: `${field} format is invalid` });
      }
      if (rules.enum && !rules.enum.includes(str)) {
        errors.push({ field, message: `${field} must be one of: ${rules.enum.join(", ")}` });
      }
      if (rules.sanitize !== false) str = stripHtml(str) as string;
      value = str;
    }

    if (rules.type === "number" && typeof value === "number") {
      if (rules.min !== undefined && value < rules.min) {
        errors.push({ field, message: `${field} must be at least ${rules.min}` });
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push({ field, message: `${field} must be at most ${rules.max}` });
      }
    }

    if (typeof value === "string") {
      const { safe, threats } = detectAttacks(value);
      if (!safe) {
        errors.push({ field, message: `${field} contains potentially malicious content`, threats });
      }
    }

    sanitized[field] = value;
  }

  if (errors.length > 0) {
    throw { type: "validation", errors };
  }
  return sanitized;
}

/** Common validation schemas. */
export const schemas: Record<string, ValidationSchema> = {
  listing: {
    title: { type: "string", required: true, minLength: 3, maxLength: 200 },
    description: { type: "string", required: true, minLength: 10, maxLength: 5_000 },
    city: { type: "string", required: true, minLength: 2, maxLength: 100 },
    address: { type: "string", required: true, minLength: 5, maxLength: 500 },
    category: {
      type: "string",
      required: true,
      enum: ["event_space", "meeting_room", "studio", "coworking", "other"],
    },
    price_kobo: { type: "number", required: true, min: 100, max: 100_000_000 },
    capacity: { type: "number", required: true, min: 1, max: 10_000 },
  },
  booking: {
    listing_id: { type: "string", required: true },
    start_date: { type: "string", required: true, pattern: /^\d{4}-\d{2}-\d{2}$/ },
    end_date: { type: "string", required: true, pattern: /^\d{4}-\d{2}-\d{2}$/ },
    headcount: { type: "number", required: true, min: 1, max: 10_000 },
  },
  review: {
    rating: { type: "number", required: true, min: 1, max: 5 },
    comment: { type: "string", required: true, minLength: 10, maxLength: 2_000 },
  },
  profile: {
    full_name: { type: "string", required: true, minLength: 2, maxLength: 200 },
    email: {
      type: "string",
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: { type: "string", required: false, pattern: /^\+?[\d\s-]{10,}$/ },
  },
};
