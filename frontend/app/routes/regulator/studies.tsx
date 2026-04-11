import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import type { RegulatorStudy } from "~/lib/types";

export default function RegulatorStudiesPage() {
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
        console.error("Failed to load pending studies", err);
        setError("Could not load pending studies.");
      } finally {
        setIsLoading(false);
      }
    }

    loadStudies();
  }, []);

  return (
    <AppShell
      role="regulator"
      title="Pending Studies"
      subtitle="Review studies submitted by researchers before approval."
    >
      <div className="space-y-6">
        <SectionHeading
          title="Studies awaiting review"
          description="These studies are currently pending regulator review."
        />

        {isLoading ? (
          <Card>
            <p className="text-sm text-slate-600">Loading pending studies...</p>
          </Card>
        ) : error ? (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">
              Unable to load studies
            </h2>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
          </Card>
        ) : studies.length === 0 ? (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">
              No pending studies to show
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              There are currently no study submissions waiting for review.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {studies.map((study) => (
              <Card key={study.study_id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      {study.reviewed_before ? (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-700">
                          Reviewed
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-700">
                          New
                        </span>
                      )}

                      <h2 className="text-lg font-semibold text-slate-900">
                        {study.study_name}
                      </h2>
                    </div>

                    <p className="mt-2 text-sm text-slate-600">
                      {study.description || "No study description provided."}
                    </p>

                    <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <span className="font-medium text-slate-900">
                          Study ID:
                        </span>{" "}
                        {study.study_id}
                      </div>

                      <div>
                        <span className="font-medium text-slate-900">
                          Researcher ID:
                        </span>{" "}
                        {study.creator_id ?? "Unknown"}
                      </div>

                      <div>
                        <span className="font-medium text-slate-900">
                          Review history:
                        </span>{" "}
                        {study.issue_count > 0
                          ? `${study.issue_count} issue${study.issue_count === 1 ? "" : "s"} raised`
                          : "No previous issues"}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-3">
                    <Button
                      onClick={() =>
                        navigate(`/regulator/studies/${study.study_id}`)
                      }
                    >
                      Open details
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
