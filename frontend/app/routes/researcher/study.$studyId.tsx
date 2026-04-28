import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import AppShell from "~/components/layout/AppShell";
import ParticipantDataTable from "~/components/researcher/ParticipantDataTable";
import Badge from "~/components/ui/Badge";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import {
  getResearcherDisplayStatus,
  getResearcherDisplayStatusMeta,
} from "~/lib/studyStatus";
import type { StudyDataResponse, StudyDetail, StudyIssue } from "~/lib/types";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function ResearcherStudyDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const studyId = Number(params.studyId);

  const [study, setStudy] = useState<StudyDetail | null>(null);
  const [issues, setIssues] = useState<StudyIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<StudyDataResponse | null>(null);
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

      const issuesResponse = await api.getStudyIssues(studyId).catch(() => ({
        issues: [],
      }));
      setIssues(issuesResponse.issues);

      try {
        const studyResponse = await api.getStudy(studyId);
        setStudy(studyResponse.study);
      } catch (err) {
        setStudy(null);
        setError(
          err instanceof Error
            ? err.message
            : "Study details are not currently available.",
        );
      }

      try {
        const dataResponse = await api.getStudyData(studyId);
        setData(dataResponse);
      } catch (err) {
        setData(null);
        setDataMessage(
          err instanceof Error
            ? err.message
            : "Participant data is not currently available.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudy();
  }, [studyId]);

  const issueCount = issues.length;
  const displayStatus = getResearcherDisplayStatus(
    study?.status ?? "pending",
    issueCount,
  );
  const statusMeta = getResearcherDisplayStatusMeta(displayStatus);
  const openIssues = issues.filter((issue) => issue.status === "open");
  const latestIssue = issues.length > 0 ? issues[0] : null;
  const hasOpenIssue = issues.some((issue) => issue.status === "open");
  const hasRespondedIssue = issues.some(
    (issue) => issue.status === "responded",
  );

  console.log("STUDY DETAIL DEBUG:", {
    hasOpenIssue,
    hasRespondedIssue,
    issues: issues.map((issue) => ({
      issue_id: issue.issue_id,
      status: issue.status,
    })),
    displayStatus,
  });

  return (
    <AppShell
      role="researcher"
      title={study ? study.study_name : "Study Details"}
      subtitle="Review approval status, regulator feedback, and participant data where available."
    >
      <SectionHeading
        title="Study overview"
        description="Participant data is only available when the backend allows access to the consented dataset."
      />

      {loading ? (
        <p className="text-sm text-slate-500">Loading study data...</p>
      ) : (
        <div className="space-y-4">
          {study ? (
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
                    <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
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
          ) : (
            <Card>
              <p className="text-sm text-slate-600">
                {error || "Study details are not currently available."}
              </p>
            </Card>
          )}

          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Review status
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {statusMeta.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                {issueCount > 0 ? (
                  <Badge tone="danger">
                    {issueCount} issue{issueCount === 1 ? "" : "s"}
                  </Badge>
                ) : null}
              </div>
            </div>

            {latestIssue ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">
                  Latest regulator feedback
                </p>

                {latestIssue.comment ? (
                  <p className="mt-2 text-sm text-slate-700">
                    {latestIssue.comment}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    This issue does not include a general comment.
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="neutral">
                    Raised {formatDate(latestIssue.created_at)}
                  </Badge>

                  {latestIssue.flagged_field_ids.length > 0 ? (
                    <Badge tone="warning">
                      {latestIssue.flagged_field_ids.length} flagged field
                      {latestIssue.flagged_field_ids.length === 1 ? "" : "s"}
                    </Badge>
                  ) : null}

                  <Badge
                    tone={latestIssue.status === "open" ? "danger" : "neutral"}
                  >
                    {latestIssue.status}
                  </Badge>
                </div>

                {latestIssue.flagged_fields &&
                latestIssue.flagged_fields.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-slate-900">
                      Flagged fields
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {latestIssue.flagged_fields.map((field) => (
                        <Badge key={field.field_id} tone="warning">
                          {field.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">
                  No regulator issues have been raised for this study.
                </p>
              </div>
            )}

            {openIssues.length > 1 ? (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-900">
                  Open issues
                </p>
                <div className="mt-3 space-y-3">
                  {openIssues.map((issue) => (
                    <div
                      key={issue.issue_id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="danger">Open issue</Badge>
                        <Badge tone="neutral">
                          Raised {formatDate(issue.created_at)}
                        </Badge>
                      </div>

                      {issue.comment ? (
                        <p className="mt-3 text-sm text-slate-700">
                          {issue.comment}
                        </p>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">
                          No general comment was provided.
                        </p>
                      )}

                      {issue.flagged_fields &&
                      issue.flagged_fields.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {issue.flagged_fields.map((field) => (
                            <Badge key={field.field_id} tone="warning">
                              {field.name}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {displayStatus === "changes_requested" &&
            hasOpenIssue &&
            !hasRespondedIssue ? (
              <Button
                variant="secondary"
                onClick={() =>
                  navigate(`/researcher/studies/${studyId}/modify`)
                }
              >
                Modify study
              </Button>
            ) : displayStatus === "changes_requested" && hasRespondedIssue ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    ⏳
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      Awaiting regulator review
                    </p>
                    <p className="mt-1 text-sm text-amber-700">
                      You have submitted changes for this issue. The study
                      cannot be modified again until the regulator reviews your
                      response.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
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
