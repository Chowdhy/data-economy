import Card from "~/components/ui/Card";

/**
 * Props expected by the ConsentSummary component
 */
interface ConsentSummaryProps {
  totalStudies: number;
  fullConsentCount: number;
  partialConsentCount: number;
}

/**
 * Displays a summary overview of the user's consent status.
 * Shows total studies joined, full consent count,
 * and partial consent count inside styled summary cards.
 */
export default function ConsentSummary({
  totalStudies,
  fullConsentCount,
  partialConsentCount,
}: ConsentSummaryProps) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Consent Overview</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Studies joined</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {totalStudies}
          </p>
        </div>

        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">Full consent</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-800">
            {fullConsentCount}
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 p-4">
          <p className="text-sm text-amber-700">Partial consent</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">
            {partialConsentCount}
          </p>
        </div>
      </div>
    </Card>
  );
}
