import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import { api } from "~/lib/api";
import type { RegulatorStudy } from "~/lib/types";

export default function RegulatorDashboard() {
  const navigate = useNavigate();

  const [studies, setStudies] = useState<RegulatorStudy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudies() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.getPendingStudies();
        setStudies(response.studies);
      } catch (err) {
        console.error("Failed to load regulator dashboard data", err);
        setError("Could not load dashboard summary.");
      } finally {
        setIsLoading(false);
      }
    }

    loadStudies();
  }, []);

  const summary = useMemo(() => {
    const newStudies = studies.filter((study) => !study.reviewed_before).length;
    const awaitingModification = studies.filter(
      (study) => study.reviewed_before,
    ).length;

    // Placeholder until modified-study workflow exists
    const needsReviewAgain = 0;

    return {
      newStudies,
      awaitingModification,
      needsReviewAgain,
    };
  }, [studies]);

  return (
    <AppShell
      role="regulator"
      title="Change to Hi [Name]"
      subtitle="Review submitted studies and approve, reject or request modifications"
    >
      <div className="space-y-6">
        {isLoading ? (
          <Card>
            <p className="text-sm text-slate-600">Loading dashboard...</p>
          </Card>
        ) : error ? (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">
              Unable to load dashboard
            </h2>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <div className="min-h-[220px] p-2">
                <p className="text-sm text-slate-500">New studies</p>
                <p className="mt-4 text-4xl font-semibold text-slate-900">
                  {summary.newStudies}
                </p>
                <p className="mt-4 text-sm text-slate-600">
                  Pending studies that have not yet been reviewed
                </p>
              </div>
            </Card>

            <Card>
              <div className="min-h-[220px] p-2">
                <p className="text-sm text-slate-500">Awaiting modification</p>
                <p className="mt-4 text-4xl font-semibold text-slate-900">
                  {summary.awaitingModification}
                </p>
                <p className="mt-4 text-sm text-slate-600">
                  Studies that were reviewed and already have raised issues
                </p>
              </div>
            </Card>

            <Card>
              <div className="min-h-[220px] p-2">
                <p className="text-sm text-slate-500">Need reviewing again</p>
                <p className="mt-4 text-4xl font-semibold text-slate-900">
                  {summary.needsReviewAgain}
                </p>
                <p className="mt-4 text-sm text-slate-600">
                  Revised studies ready for another review
                </p>
              </div>
            </Card>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate("/regulator/studies")}>
            View pending studies
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
