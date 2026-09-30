const SECRET = process.env.CLERK_SECRET_KEY;
const API = "https://api.clerk.com/v1";

interface ClerkError {
  long_message?: string;
  longMessage?: string;
  message?: string;
}

interface ClerkErrorResponse {
  errors?: ClerkError[];
}

function getClerkError(data: ClerkErrorResponse): string | null {
  if (!data?.errors?.length) return null;
  const e = data.errors[0];
  if (!e) return null;
  return e.long_message ?? e.longMessage ?? e.message ?? "Clerk API error";
}

/** Typed error with HTTP status attached. */
export class ClerkApiError extends Error {
  status: number;
  errors?: ClerkError[];

  constructor(message: string, status: number, errors?: ClerkError[]) {
    super(message);
    this.name = "ClerkApiError";
    this.status = status;
    this.errors = errors;
  }
}

/**
 * Authenticated fetch wrapper for the Clerk REST API.
 * Throws `ClerkApiError` on non-2xx responses or network failures.
 */
export async function clerkFetch(
  path: string,
  options: RequestInit = {}
): Promise<unknown> {
  if (!SECRET) {
    throw new ClerkApiError(
      "Authentication service is not configured (missing CLERK_SECRET_KEY).",
      500
    );
  }

  const controller = new AbortController();
  // Vercel hobby functions timeout at 10s — keep Clerk fetch well under that.
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(`${API}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${SECRET}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    clearTimeout(timeout);

    let data: ClerkErrorResponse = {};
    try {
      data = (await res.json()) as ClerkErrorResponse;
    } catch {
      data = {};
    }

    if (!res.ok) {
      throw new ClerkApiError(
        getClerkError(data) ?? `Clerk API error (${res.status})`,
        res.status,
        data.errors
      );
    }

    return data;
  } catch (err) {
    clearTimeout(timeout);

    if (err instanceof ClerkApiError) throw err;

    const e = err as Error;
    if (e.name === "AbortError") {
      throw new ClerkApiError(
        "Authentication service timed out. Please try again in a moment.",
        503
      );
    }

    // Map low-level network failures to user-friendly 503
    if (e.message && /fetch failed|ECONN|ENOTFOUND|UND_ERR/i.test(e.message)) {
      const wrapped = new ClerkApiError(
        "Authentication service is temporarily unreachable. Please try again shortly.",
        503
      );
      (wrapped as ClerkApiError & { cause: Error }).cause = e;
      throw wrapped;
    }

    throw err;
  }
}
