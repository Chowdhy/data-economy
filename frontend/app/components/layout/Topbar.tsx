interface TopbarProps {
  title: string;
  subtitle?: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-emerald-700">
        Consent-first research platform
      </p>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {title}
      </h1>

      {subtitle ? (
        <p className="mt-2 max-w-3xl text-sm text-slate-600">{subtitle}</p>
      ) : null}
    </header>
  );
}
