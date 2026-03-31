import { Link } from "react-router";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-emerald-700">
          Consent-oriented research platform
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
          Clear, ethical study management for participants and researchers
        </h1>

        <p className="mt-4 max-w-2xl text-slate-600">
          Participants can review studies and manage consent with confidence.
          Researchers can create studies and only access data that has been
          consented to.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link
            to="/participant/dashboard"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 transition hover:bg-emerald-100"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Participant dashboard
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              View joined studies, update answers, and manage consent choices.
            </p>
          </Link>

          <Link
            to="/researcher/dashboard"
            className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:bg-slate-100"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Researcher dashboard
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Create studies, view participant counts, and inspect consented
              data.
            </p>
          </Link>
        </div>

        <div className="mt-6">
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            <Link
              to="/login"
              className="text-emerald-700 hover:text-emerald-800"
            >
              Go to login
            </Link>
            <Link
              to="/signup"
              className="text-slate-700 hover:text-slate-900"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
