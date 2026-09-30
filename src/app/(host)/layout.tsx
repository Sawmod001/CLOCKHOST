import RoleGate from "@/components/RoleGate";

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allowedRoles={["venue_host", "shortlet_host", "admin"]}>
      {children}
    </RoleGate>
  );
}
