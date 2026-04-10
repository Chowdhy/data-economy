import { Link, useLocation, useNavigate } from "react-router";
import Button from "~/components/ui/Button";
import { clearAuthSession } from "~/lib/auth";
import type { User } from "~/lib/types";
import { titleCase } from "~/lib/utils";

interface TopbarProps {
  title: string;
  subtitle?: string;
  currentUser: User;
}

export default function Topbar({
  title,
  subtitle,
  currentUser,
}: TopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    clearAuthSession();
    navigate("/login", {
      replace: true,
      state: {
        logoutMessage: "You have been logged out.",
        from: location.pathname,
      },
    });
  }

  return (
    <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            Consent-first research platform
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>

          {subtitle ? (
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{subtitle}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:min-w-80">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Signed in account
          </p>
          <p className="mt-2 text-base font-semibold text-slate-900">
            {currentUser.name}
          </p>
          <p className="text-sm text-slate-600">{currentUser.email}</p>
          <p className="mt-2 text-sm text-slate-500">
            {titleCase(currentUser.role_id)} account
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/account"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              My account
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Switch account
            </Link>
            <Button type="button" variant="ghost" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
