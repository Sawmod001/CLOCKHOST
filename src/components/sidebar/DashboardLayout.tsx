"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import Logo from "@/components/Logo";

interface DashboardLayoutProps {
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sidebar: React.ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sidebarProps?: Record<string, any>;
}

export default function DashboardLayout({ children, sidebar, sidebarProps = {} }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const SidebarComponent = sidebar;

  return (
    <div className="min-h-screen bg-[var(--color-surface-alt)]">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-white px-4 py-2 sm:py-3 lg:hidden">
        <Logo size="sm" />
        <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-[var(--color-surface-alt)]">
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-64 max-w-[calc(100vw-2rem)] overflow-y-auto bg-white p-6 shadow-lg border-r border-[var(--color-border)]">
            <SidebarComponent {...sidebarProps} onClose={() => setSidebarOpen(false)} />
          </div>
          <div className="flex-1 min-w-0 bg-black/20" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Desktop layout */}
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-4 sm:py-6 lg:px-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-6 rounded-2xl border border-[var(--color-border)] bg-white p-4">
            <SidebarComponent {...sidebarProps} onClose={() => setSidebarOpen(false)} />
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-6 overflow-x-clip">
          {children}
        </main>
      </div>
    </div>
  );
}
