"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const REDIRECT_MAP: Record<string, string> = {
  guest: "/dashboard",
  venue_host: "/host/dashboard",
  shortlet_host: "/host/dashboard",
  admin: "/admin",
};

interface RoleGateProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export default function RoleGate({ allowedRoles, children }: RoleGateProps) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/profile-status")
      .then((r) => r.json())
      .then((data) => {
        const role: string = data.role || "guest";
        if (allowedRoles.includes(role)) {
          setAllowed(true);
        } else {
          router.replace(REDIRECT_MAP[role] || "/dashboard");
        }
      })
      .catch(() => {
        router.replace("/sign-in");
      });
  }, [allowedRoles, router]);

  if (allowed === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[var(--color-ink-muted)]" />
      </div>
    );
  }

  return children;
}
