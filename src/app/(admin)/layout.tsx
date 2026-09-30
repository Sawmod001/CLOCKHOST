import RoleGate from "@/components/RoleGate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allowedRoles={["admin"]}>
      {children}
    </RoleGate>
  );
}
