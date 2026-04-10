import { Link, useNavigate } from "react-router";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import SectionHeading from "~/components/ui/SectionHeading";
import {
  clearAuthSession,
  getCurrentUser,
  getDefaultRouteForRole,
  getSavedSessions,
  switchAccount,
} from "~/lib/auth";
import { titleCase } from "~/lib/utils";

export default function AccountPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const savedSessions = getSavedSessions();

  if (!currentUser) {
    return (
      <AppShell title="My Account" subtitle="Manage your saved sessions and account details.">
        <Card>
          <p className="text-sm text-slate-600">Redirecting to login...</p>
        </Card>
      </AppShell>
    );
  }

  function handleLogout() {
    clearAuthSession();
    navigate("/login", {
      replace: true,
      state: { logoutMessage: "You have been logged out." },
    });
  }

  function handleSwitchAccount(userId: number) {
    const switched = switchAccount(userId);
    if (!switched) return;

    const nextUser = getCurrentUser();
    if (!nextUser) return;

    navigate(getDefaultRouteForRole(nextUser.role_id), { replace: true });
  }

  const primaryLink =
    currentUser.role_id === "participant"
      ? { to: "/participant/profile", label: "Edit my answers" }
      : { to: "/researcher/studies", label: "Open my studies" };

  return (
    <AppShell
      role={currentUser.role_id}
      title="My Account"
      subtitle="Review your account details, move between saved sessions, or sign out."
    >
      <div className="space-y-6">
        <SectionHeading
          title="Account details"
          description="This is the account currently active in the application."
        />

        <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
          <Card>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {currentUser.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p className="mt-1 text-sm text-slate-900">{currentUser.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Role</p>
                <p className="mt-1 text-sm text-slate-900">
                  {titleCase(currentUser.role_id)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">User ID</p>
                <p className="mt-1 text-sm text-slate-900">{currentUser.user_id}</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
            <p className="mt-1 text-sm text-slate-600">
              Jump back into the flow that matches your account.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to={primaryLink.to}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                {primaryLink.label}
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Go to login page
              </Link>
              <Button type="button" variant="ghost" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          </Card>
        </div>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Switch accounts</h2>
          <p className="mt-1 text-sm text-slate-600">
            Saved sessions stay available here so you can move between accounts quickly.
          </p>

          <div className="mt-5 space-y-3">
            {savedSessions.map((session) => {
              const isCurrent = session.user.user_id === currentUser.user_id;

              return (
                <div
                  key={session.user.user_id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {session.user.name}
                    </p>
                    <p className="text-sm text-slate-600">{session.user.email}</p>
                    <p className="text-xs text-slate-500">
                      {titleCase(session.user.role_id)}
                      {isCurrent ? " | Current account" : ""}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant={isCurrent ? "secondary" : "primary"}
                    onClick={() => handleSwitchAccount(session.user.user_id)}
                  >
                    {isCurrent ? "Current account" : "Switch to this account"}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
