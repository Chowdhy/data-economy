import { useState } from "react";
import { useNavigate } from "react-router";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import Input from "~/components/ui/Input";

export default function LoginPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState<"participant" | "researcher">("participant");
  const [userId, setUserId] = useState("1");
  const [email, setEmail] = useState("");

  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    localStorage.setItem("demo_role", role);
    localStorage.setItem("demo_user_id", userId);
    localStorage.setItem("demo_email", email);

    navigate(
      role === "participant"
        ? "/participant/dashboard"
        : "/researcher/dashboard",
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-slate-900">Login</h1>
        <p className="mt-2 text-sm text-slate-600">
          This is a simple role-based login screen for your dashboard flow.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="userId"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              User ID
            </label>
            <Input
              id="userId"
              type="number"
              placeholder="Enter your user ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Account type
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("participant")}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  role === "participant"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Participant
              </button>

              <button
                type="button"
                onClick={() => setRole("researcher")}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  role === "researcher"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Researcher
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      </Card>
    </div>
  );
}
