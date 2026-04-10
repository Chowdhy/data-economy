import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { api } from "~/lib/api";
import {
  getCurrentUser,
  getDefaultRouteForRole,
  getSavedSessions,
  setAuthSession,
  switchAccount,
} from "~/lib/auth";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import Input from "~/components/ui/Input";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getCurrentUser();
  const savedSessions = getSavedSessions();
  const loginMessage = location.state?.loginMessage as string | undefined;
  const logoutMessage = location.state?.logoutMessage as string | undefined;
  const signupMessage = location.state?.signupMessage as string | undefined;
  const from = location.state?.from as string | undefined;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);

      const response = await api.login({
        email,
        password,
      });

      const user = response.user;
      setAuthSession(user, response.access_token);
      navigate(from || getDefaultRouteForRole(user.role_id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function handleSwitchAccount(userId: number) {
    const switched = switchAccount(userId);
    if (!switched) {
      setError("That saved account is no longer available.");
      return;
    }

    const savedUser = getCurrentUser();
    if (!savedUser) {
      setError("Failed to switch accounts.");
      return;
    }

    navigate(getDefaultRouteForRole(savedUser.role_id));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-xl">
        <h1 className="text-2xl font-semibold text-slate-900">Login</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to your account to continue.
        </p>

        {loginMessage ? <p className="mt-4 text-sm text-slate-600">{loginMessage}</p> : null}
        {logoutMessage ? <p className="mt-2 text-sm text-emerald-700">{logoutMessage}</p> : null}
        {signupMessage ? <p className="mt-2 text-sm text-emerald-700">{signupMessage}</p> : null}
        {currentUser ? (
          <p className="mt-2 text-sm text-slate-500">
            Current session: {currentUser.name} ({currentUser.email})
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="font-medium text-emerald-700 hover:text-emerald-800"
          >
            Create one
          </Link>
        </p>

        {savedSessions.length > 0 ? (
          <div className="mt-8 border-t border-slate-200 pt-6">
            <h2 className="text-sm font-semibold text-slate-900">
              Saved accounts
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Switch without re-entering your password.
            </p>

            <div className="mt-4 space-y-3">
              {savedSessions.map((session) => {
                const isCurrent = currentUser?.user_id === session.user.user_id;

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
                        {session.user.role_id}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant={isCurrent ? "secondary" : "primary"}
                      onClick={() => handleSwitchAccount(session.user.user_id)}
                    >
                      {isCurrent ? "Continue" : "Switch account"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
