import { Link, useLocation } from "react-router";
import { cn } from "~/lib/utils";

interface SidebarProps {
  role: "participant" | "researcher" | "regulator";
}

export default function Sidebar({ role }: SidebarProps) {
  const location = useLocation();

  const links =
    role === "participant"
      ? [
          { to: "/participant/dashboard", label: "Dashboard" },
          { to: "/participant/discover", label: "Join Studies" },
          { to: "/participant/studies", label: "My Studies" },
          { to: "/participant/profile", label: "My Answers" },
        ]
      : role === "researcher"
        ? [
            { to: "/researcher/dashboard", label: "Dashboard" },
            { to: "/researcher/fields", label: "Fields" },
            { to: "/researcher/studies", label: "Studies" },
            { to: "/researcher/create-study", label: "Create Study" },
          ]
        : [
            { to: "/regulator/dashboard", label: "Dashboard" },
            { to: "/regulator/studies", label: "Pending Studies" },
          ];

  return (
    <aside className="hidden w-64 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
      <p className="mb-4 text-sm font-semibold text-emerald-700">
        {role === "participant"
          ? "Participant area"
          : role === "researcher"
            ? "Researcher area"
            : "Regulator area"}
      </p>

      <nav className="space-y-2" aria-label={`${role} navigation`}>
        {links.map((link) => {
          const active =
            location.pathname === link.to ||
            (link.to !== "/" && location.pathname.startsWith(`${link.to}/`));

          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "block rounded-xl px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-700 hover:bg-slate-50",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
