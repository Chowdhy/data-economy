import { Link, useLocation, useNavigate } from "react-router";
import Button from "~/components/ui/Button";
import { clearAuthSession } from "~/lib/auth";
import { cn } from "~/lib/utils";
import type { User } from "~/lib/types";
import { titleCase } from "~/lib/utils";

interface TopbarProps {
  title: string;
  subtitle?: string;
  currentUser: User;
  role?: "participant" | "researcher" | "regulator";
}

const NAV_LINKS: Record<string, { to: string; label: string }[]> = {
  participant: [
    { to: "/participant/dashboard", label: "Dashboard" },
    { to: "/participant/discover", label: "Join Studies" },
    { to: "/participant/studies", label: "My Studies" },
    { to: "/participant/profile", label: "My Answers" },
  ],
  researcher: [
    { to: "/researcher/dashboard", label: "Dashboard" },
    { to: "/researcher/studies", label: "Studies" },
    { to: "/researcher/create-study", label: "Create Study" },
  ],
  regulator: [
    { to: "/regulator/dashboard", label: "Dashboard" },
    { to: "/regulator/studies", label: "Studies" },
  ],
};

export default function Topbar({ title, subtitle, currentUser, role }: TopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const links = role ? NAV_LINKS[role] : [];

  function handleLogout() {
    clearAuthSession();
    navigate("/", {
      replace: true,
      state: {
        logoutMessage: "You have been logged out.",
        from: location.pathname,
      },
    });
  }

  return (
    <header className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
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
                to="/"
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
      </div>

      {links.length > 0 ? (
        <nav
          className="flex gap-1 border-t border-slate-100 px-4"
          aria-label="navigation"
        >
          {links.map((link) => {
            const active =
              location.pathname === link.to ||
              (link.to !== "/" && location.pathname.startsWith(`${link.to}/`));

            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "relative -mb-px border-b-2 px-4 py-3 text-sm font-medium transition",
                  active
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-800",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
