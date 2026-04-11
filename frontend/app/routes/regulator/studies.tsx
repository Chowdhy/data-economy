import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import SectionHeading from "~/components/ui/SectionHeading";

type PendingStudy = {
  study_id: number;
  study_name: string;
  description?: string;
  status?: string;
  creator_id?: number;
  required_field_ids?: number[];
  optional_field_ids?: number[];
  data_collection_months?: number;
  research_duration_months?: number;
};

export default function RegulatorStudiesPage() {
  const navigate = useNavigate();
  const [studies, setStudies] = useState<PendingStudy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudies() {
      setIsLoading(true);
      setError(null);

      try {
        // TODO:
        // Replace this once the backend endpoint exists, for example:
        // const response = await api.getPendingStudies();
        // setStudies(response);

        setStudies([]);
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
          description="This page is ready for a pending-studies API. Until that is connected, no studies will appear here."
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
              Once you add the backend endpoint for regulator study review,
              pending submissions can be listed here.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {studies.map((study) => (
              <Card key={study.study_id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {study.study_name}
                    </h2>

                    <p className="mt-2 text-sm text-slate-600">
                      {study.description || "No study description provided."}
                    </p>

                    <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-5">
                      <div>
                        <span className="font-medium text-slate-900">
                          Study ID:
                        </span>{" "}
                        {study.study_id}
                      </div>

                      <div>
                        <span className="font-medium text-slate-900">
                          Creator:
                        </span>{" "}
                        {study.creator_id ?? "Unknown"}
                      </div>

                      <div>
                        <span className="font-medium text-slate-900">
                          Required fields:
                        </span>{" "}
                        {study.required_field_ids?.length ?? 0}
                      </div>

                      <div>
                        <span className="font-medium text-slate-900">
                          Optional fields:
                        </span>{" "}
                        {study.optional_field_ids?.length ?? 0}
                      </div>

                      <div>
                        <span className="font-medium text-slate-900">
                          Duration:
                        </span>{" "}
                        {study.research_duration_months ?? "—"} months
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-3">
                    <Button
                      onClick={() =>
                        navigate(`/regulator/studies/${study.study_id}`)
                      }
                    >
                      Open review
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
