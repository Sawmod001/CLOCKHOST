import type { ClerkPublicMetadata } from "@/types/domain";

/**
 * Compute the post-auth redirect path based on user metadata.
 * Called after sign-in / sign-up to land the user in the right place.
 */
export function getRedirectPath(meta: Partial<ClerkPublicMetadata> = {}): string {
  const role = meta.role ?? "guest";

  if (role === "admin") return "/admin";
  if (!meta.profileCompleted) return "/complete-profile";
  if (role === "venue_host" || role === "shortlet_host") return "/host/dashboard";

  return "/dashboard";
}
