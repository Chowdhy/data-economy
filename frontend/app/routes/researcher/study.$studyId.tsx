import { useEffect, useState } from "react";
import { useParams } from "react-router";
import AppShell from "~/components/layout/AppShell";
import ParticipantDataTable from "~/components/researcher/ParticipantDataTable";
import Card from "~/components/ui/Card";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import type { StudyDataResponse } from "~/lib/types";

export default function ResearcherStudyDetailPage() {
  const params = useParams();
  const studyId = Number(params.studyId);

  const [data, setData] = useState<StudyDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStudyData() {
      if (!studyId || Number.isNaN(studyId)) {
        setError("Invalid study ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const response = await api.getStudyData(studyId);
        setData(response);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load study data",
        );
      } finally {
        setLoading(false);
      }
    }

    loadStudyData();
  }, [studyId]);

  return (
    <AppShell
      role="researcher"
      title={data ? data.study.study_name : "Study Details"}
      subtitle="Only data for consented fields should appear here."
    >
      <SectionHeading
        title="Study data"
        description="This view groups participant responses by participant ID and only shows fields that are currently consented."
      />

      {loading ? (
        <p className="text-sm text-slate-500">Loading study data...</p>
      ) : error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : !data ? (
        <Card>
          <p className="text-sm text-slate-500">No study data found.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-slate-500">Study ID</p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {data.study.study_id}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Study name</p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {data.study.study_name}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Status</p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {data.study.status}
                </p>
              </div>
            </div>
          </Card>

          <ParticipantDataTable data={data} />
        </div>
      )}
    </AppShell>
  );
}
