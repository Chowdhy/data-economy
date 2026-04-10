import { useEffect, useState } from "react";
import { useParams } from "react-router";
import AppShell from "~/components/layout/AppShell";
import ParticipantDataTable from "~/components/researcher/ParticipantDataTable";
import Badge from "~/components/ui/Badge";
import Card from "~/components/ui/Card";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import type { StudyDataResponse, StudyDetail } from "~/lib/types";
import { titleCase } from "~/lib/utils";

export default function ResearcherStudyDetailPage() {
  const params = useParams();
  const studyId = Number(params.studyId);

  const [study, setStudy] = useState<StudyDetail | null>(null);
  const [data, setData] = useState<StudyDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dataMessage, setDataMessage] = useState("");

  async function loadStudy() {
    if (!studyId || Number.isNaN(studyId)) {
      setError("Invalid study ID.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setDataMessage("");

      const studyResponse = await api.getStudy(studyId);
      setStudy(studyResponse.study);

      try {
        const dataResponse = await api.getStudyData(studyId);
        setData(dataResponse);
      } catch (err) {
        setData(null);
        setDataMessage(
          err instanceof Error
            ? err.message
            : "Study data is not currently available.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load study");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudy();
  }, [studyId]);

  return (
    <AppShell
      role="researcher"
      title={study ? study.study_name : "Study Details"}
      subtitle="Study data is only available while the study is ongoing."
    >
      <SectionHeading
        title="Study data"
        description="Participant responses appear when the study is active and the backend allows access to the consented dataset."
      />

      {loading ? (
        <p className="text-sm text-slate-500">Loading study data...</p>
      ) : error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : !study ? (
        <Card>
          <p className="text-sm text-slate-500">No study data found.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-slate-500">Study ID</p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {study.study_id}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Status</p>
                <div className="mt-1">
                  <Badge tone="neutral">{titleCase(study.status)}</Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500">Participants</p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {study.participant_count}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Collection</p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {study.data_collection_months
                    ? `${study.data_collection_months} months`
                    : "-"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Research duration</p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {study.research_duration_months
                    ? `${study.research_duration_months} months`
                    : "-"}
                </p>
              </div>
            </div>

            {study.description ? (
              <div className="mt-4">
                <p className="text-sm text-slate-500">Description</p>
                <p className="mt-1 text-sm text-slate-700">
                  {study.description}
                </p>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="success">
                {study.required_field_ids.length} required fields
              </Badge>
              {study.optional_field_ids.length > 0 ? (
                <Badge tone="neutral">
                  {study.optional_field_ids.length} optional fields
                </Badge>
              ) : null}
            </div>
          </Card>

          {data ? (
            <ParticipantDataTable data={data} />
          ) : (
            <Card>
              <p className="text-sm text-slate-600">
                {dataMessage || "Participant data is not currently available."}
              </p>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}
