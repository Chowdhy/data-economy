import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import FlaggableFieldList from "~/components/regulator/FlaggableFieldList";
import ReviewActionsCard from "~/components/regulator/ReviewActionsCard";
import StudyReviewSummary from "~/components/regulator/StudyReviewSummary";
import type { RegulatorStudyDetail } from "~/lib/types";
import { api } from "~/lib/api";

export default function RegulatorStudyReviewPage() {
  const navigate = useNavigate();
  const { studyId } = useParams();

  const [study, setStudy] = useState<RegulatorStudyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedFieldIds, setSelectedFieldIds] = useState<number[]>([]);
  const [comment, setComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudy() {
      if (!studyId) {
        setError("No study ID was provided.");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await api.getRegulatorStudyDetail(Number(studyId));
        setStudy(response);
      } catch (err) {
        console.error("Failed to load study", err);
        setError("Could not load the study for review.");
      } finally {
        setIsLoading(false);
      }
    }

    loadStudy();
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

      //Go back after approve
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

      setActionMessage("Reject action is ready to be connected to the API.");
    } catch (err) {
      console.error("Failed to reject study", err);
      setActionMessage("Could not reject the study.");
    }
  }

  function handleRaiseIssues() {
    setActionMessage(
      "Raise issues UI is ready, but backend submission is not connected yet.",
    );
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
              Connect this page to a study detail endpoint to review a submitted
              study here.
            </p>
          </Card>
        ) : (
          <>
            <StudyReviewSummary study={study} />

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
          </>
        )}
      </div>
    </AppShell>
  );
}
