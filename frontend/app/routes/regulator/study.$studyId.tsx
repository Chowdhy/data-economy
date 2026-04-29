import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import FlaggableFieldList from "~/components/regulator/FlaggableFieldList";
import IssueHistoryList from "~/components/regulator/IssueHistoryList";
import ReviewActionsCard from "~/components/regulator/ReviewActionsCard";
import StudyReviewSummary from "~/components/regulator/StudyReviewSummary";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import { api } from "~/lib/api";
import type { ActivityLog, RegulatorStudyDetail, StudyIssue } from "~/lib/types";

export default function RegulatorStudyReviewPage() {
  const navigate = useNavigate();
  const { studyId } = useParams();

  const [study, setStudy] = useState<RegulatorStudyDetail | null>(null);
  const [issues, setIssues] = useState<StudyIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedFieldIds, setSelectedFieldIds] = useState<number[]>([]);
  const [comment, setComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [studyLogs, setStudyLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  async function loadIssues(currentStudyId: number) {
    try {
      setIsLoadingIssues(true);
      const response = await api.getStudyIssues(currentStudyId);
      setIssues(response.issues);
    } catch (err) {
      console.error("Failed to load study issues", err);
    } finally {
      setIsLoadingIssues(false);
    }
  }

  useEffect(() => {
    async function loadStudy() {
      if (!studyId) {
        setError("No study ID was provided.");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const numericStudyId = Number(studyId);
        const [studyResponse, issuesResponse] = await Promise.all([
          api.getRegulatorStudyDetail(numericStudyId),
          api.getStudyIssues(numericStudyId),
        ]);

        setStudy(studyResponse);
        setIssues(issuesResponse.issues);
      } catch (err) {
        console.error("Failed to load study", err);
        setError("Could not load the study for review.");
      } finally {
        setIsLoading(false);
      }
    }

    async function loadLogs() {
      if (!studyId) return;
      try {
        setLogsLoading(true);
        const res = await api.getStudyLogs(Number(studyId));
        setStudyLogs(res.logs);
      } catch {
        // Logs are supplementary — silently ignore if unavailable
      } finally {
        setLogsLoading(false);
      }
    }

    loadStudy();
    loadLogs();
  }, [studyId]);

  const allFields = useMemo(() => {
    if (!study) return [];
    return [...study.required_fields, ...study.optional_fields];
  }, [study]);

  function handleToggleField(fieldId: number) {
    setSelectedFieldIds((current) =>
      current.includes(fieldId)
        ? current.filter((id) => id !== fieldId)
        : [...current, fieldId],
    );
  }

  async function handleApprove() {
    if (!studyId) return;

    try {
      setActionMessage(null);
      await api.approveStudy(Number(studyId));
      setActionMessage("Study approved successfully.");
      navigate("/regulator/studies");
    } catch (err) {
      console.error("Failed to approve study", err);
      setActionMessage("Could not approve the study.");
    }
  }

  async function handleReject() {
    if (!studyId) return;

    try {
      setActionMessage(null);
      await api.rejectStudy(Number(studyId), rejectReason);
      setActionMessage("Study rejected successfully.");
      navigate("/regulator/studies");
    } catch (err) {
      console.error("Failed to reject study", err);
      setActionMessage("Could not reject the study.");
    }
  }

  async function handleRaiseIssues() {
    if (!studyId) return;

    try {
      setActionMessage(null);

      await api.raiseStudyIssues(Number(studyId), {
        comment: comment.trim() || undefined,
        flagged_field_ids: selectedFieldIds,
      });

      await loadIssues(Number(studyId));

      setComment("");
      setSelectedFieldIds([]);
      setActionMessage("Issues raised successfully.");
      navigate("/regulator/studies");
    } catch (err) {
      console.error("Failed to raise issues", err);
      setActionMessage("Could not raise issues for this study.");
    }
  }

  return (
    <AppShell
      role="regulator"
      title="Study Review"
      subtitle="Inspect submitted study details and decide whether to approve, reject, or request changes."
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate("/regulator/studies")}
          >
            Back to studies
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <p className="text-sm text-slate-600">Loading study...</p>
          </Card>
        ) : error ? (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">
              Unable to load study
            </h2>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
          </Card>
        ) : !study ? (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">
              No study data available
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              The study could not be loaded.
            </p>
          </Card>
        ) : (
          <>
            <StudyReviewSummary study={study} />

            {isLoadingIssues ? (
              <Card>
                <p className="text-sm text-slate-600">Loading issues...</p>
              </Card>
            ) : (
              <IssueHistoryList issues={issues} />
            )}

            <div className="grid gap-6 xl:grid-cols-2">
              <FlaggableFieldList
                title="Required fields"
                description="These fields are marked as essential by the researcher."
                fields={study.required_fields}
                selectedFieldIds={selectedFieldIds}
                onToggleField={handleToggleField}
              />

              <FlaggableFieldList
                title="Optional fields"
                description="These fields are optional for this study."
                fields={study.optional_fields}
                selectedFieldIds={selectedFieldIds}
                onToggleField={handleToggleField}
              />
            </div>

            <ReviewActionsCard
              selectedFieldCount={selectedFieldIds.length}
              totalFieldCount={allFields.length}
              comment={comment}
              onCommentChange={setComment}
              rejectReason={rejectReason}
              onRejectReasonChange={setRejectReason}
              onApprove={handleApprove}
              onReject={handleReject}
              onRaiseIssues={handleRaiseIssues}
            />

            {actionMessage ? (
              <Card>
                <p className="text-sm text-slate-600">{actionMessage}</p>
              </Card>
            ) : null}

            <StudyLogsCard logs={studyLogs} loading={logsLoading} />
          </>
        )}
      </div>
    </AppShell>
  );
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function StudyLogsCard({ logs, loading }: { logs: ActivityLog[]; loading: boolean }) {
  return (
    <Card>
      <h2 className="text-base font-semibold text-slate-900">Study activity log</h2>
      <p className="mt-1 text-sm text-slate-600">
        Full record of actions taken on this study.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading logs...</p>
      ) : logs.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No activity recorded yet.</p>
      ) : (
        <div className="mt-4 divide-y divide-slate-100">
          {logs.map((log) => (
            <div key={log.log_id} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {formatAction(log.action)}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(log.created_at).toLocaleString()}
                </span>
                {log.user_id && (
                  <span className="text-xs text-slate-500">User #{log.user_id}</span>
                )}
              </div>
              {log.details && Object.keys(log.details).length > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  {Object.entries(log.details)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
