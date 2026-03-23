import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

interface AppShellProps {
  title: string;
  subtitle?: string;
  role?: "participant" | "researcher";
  children: ReactNode;
}

export default function AppShell({
  title,
  subtitle,
  role,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Topbar title={title} subtitle={subtitle} />

        <div className="mt-6 flex gap-6">
          {role ? <Sidebar role={role} /> : null}

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
