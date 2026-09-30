import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SECURITY_HEADERS, generateCSP } from "@/lib/security";
import { parseSessionToken } from "@/lib/auth/getSessionUser";

const PUBLIC_PATHS = [
  "/",
  "/sign-in",
  "/sign-up",
  "/complete-profile",
  "/listings",
  "/about",
  "/contact",
];

const PUBLIC_API_PREFIXES = [
  "/api/auth/sign-in",
  "/api/auth/sign-up",
  "/api/auth/profile-status",
  "/api/auth/admin-setup",
  "/api/payments/webhook/",
  "/api/whatsapp/webhook",
  "/api/health",
  "/api/search",
  "/api/chat",
];

const PUBLIC_LISTING_API = [
  { prefix: "/api/listings", methods: ["GET"] },
  { prefix: "/api/listings/", methods: ["GET"] },
  { prefix: "/api/pricing/preview", methods: ["POST"] },
];

const ROLE_REDIRECT: Record<string, string> = {
  venue_host: "/host/dashboard",
  shortlet_host: "/host/dashboard",
  admin: "/admin",
  guest: "/dashboard",
};

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/listings/")) return true;
  return false;
}

function isPublicApi(pathname: string, method: string) {
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (PUBLIC_LISTING_API.some((r) => pathname.startsWith(r.prefix) && r.methods.includes(method))) return true;
  return false;
}

function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/host") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/complete-profile")
  );
}

function isProtectedApi(pathname: string) {
  const protectedPrefixes = [
    "/api/bookings",
    "/api/soft-holds",
    "/api/host",
    "/api/admin",
    "/api/settings",
    "/api/notifications",
    "/api/messages",
    "/api/users",
    "/api/disputes",
    "/api/reports",
    "/api/documents",
    "/api/export",
    "/api/viewings",
    "/api/housing",
    "/api/provider",
    "/api/calendar",
    "/api/analytics",
    "/api/reviews",
    "/api/listings",
  ];
  return protectedPrefixes.some((p) => pathname.startsWith(p));
}

function authFailResponse(request: NextRequest, pathname: string) {
  const isApi = pathname.startsWith("/api/");
  if (isApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("redirect", pathname);
  return NextResponse.redirect(url);
}

function profileIncompleteResponse(request: NextRequest, pathname: string) {
  const isApi = pathname.startsWith("/api/");
  if (isApi) {
    return NextResponse.json({ error: "Profile not completed" }, { status: 403 });
  }
  return NextResponse.redirect(new URL("/complete-profile", request.url));
}

/**
 * Lightweight auth middleware for Next.js.
 * Only does session validation + security headers on page/API responses.
 * Skips RSC navigation fetches entirely to prevent breaking client-side routing.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url);
  const { method } = request;

  const rscHeader = request.headers.get("rsc");
  const nextRouterStateTree = request.headers.get("next-router-state-tree");
  const isRsc = !!(rscHeader || nextRouterStateTree);

  const response = NextResponse.next();

  // Apply security headers to all responses including RSC (defense in depth)
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  response.headers.set("Content-Security-Policy", generateCSP());

  // CSRF defense for state-changing payment/booking routes - strict exact host match
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    if (pathname.startsWith("/api/payments/") || pathname.startsWith("/api/bookings/")) {
      const origin = request.headers.get("origin");
      const host = request.headers.get("host") || request.headers.get("x-forwarded-host") || "";
      if (origin && host) {
        try {
          const originHost = new URL(origin).host;
          if (originHost !== host) {
            return new NextResponse("Forbidden", { status: 403 });
          }
        } catch {
          return new NextResponse("Forbidden", { status: 403 });
        }
      }
    }
  }

  // === AUTH CHECKS — verified JWT via JWKS (cached) ===
  const sessionInfo = await parseSessionToken(request);
  const isAuthenticated = !!sessionInfo?.userId;

  // Public pages and APIs — skip auth
  if (isPublicPath(pathname) || isPublicApi(pathname, method)) {
    return response;
  }

  // Protected page requires auth - for RSC, return 401 JSON instead of redirect to avoid breaking flight data
  if (isProtectedPath(pathname) && !isAuthenticated) {
    if (isRsc) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: response.headers });
    }
    return authFailResponse(request, pathname);
  }

  // Protected API requires auth - always enforce even for RSC (prevents header bypass)
  if (isProtectedApi(pathname) && !isAuthenticated) {
    return authFailResponse(request, pathname);
  }

  // Onboarding enforcement: use verified payload (no extra decode)
  if (isAuthenticated && isProtectedPath(pathname) && pathname !== "/complete-profile") {
    try {
      const meta = (sessionInfo?.payload?.public_metadata || {}) as Record<string, unknown>;
      if (meta.profileCompleted === false && pathname !== "/complete-profile") {
        return profileIncompleteResponse(request, pathname);
      }
    } catch {
      // If we can't parse the token, let the API route handle it
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
