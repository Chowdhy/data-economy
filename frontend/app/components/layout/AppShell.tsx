import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { getCurrentUser, getDefaultRouteForRole } from "~/lib/auth";

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
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getCurrentUser();
  const isAuthorized = currentUser && (!role || currentUser.role_id === role);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login", {
        replace: true,
        state: {
          from: location.pathname,
          loginMessage: "Please sign in to continue.",
        },
      });
      return;
    }

    if (role && currentUser.role_id !== role) {
      navigate(getDefaultRouteForRole(currentUser.role_id), { replace: true });
    }
  }, [currentUser, location.pathname, navigate, role]);

  if (!isAuthorized || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
          Redirecting to the correct account page...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Topbar title={title} subtitle={subtitle} currentUser={currentUser} />

        <div className="mt-6 flex gap-6">
          {role ? <Sidebar role={role} /> : null}

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
