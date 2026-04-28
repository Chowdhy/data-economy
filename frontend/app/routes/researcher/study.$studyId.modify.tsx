import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import AppShell from "~/components/layout/AppShell";
import Badge from "~/components/ui/Badge";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import Input from "~/components/ui/Input";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import { getCurrentUser } from "~/lib/auth";
import {
  getResearcherDisplayStatus,
  getResearcherDisplayStatusMeta,
} from "~/lib/studyStatus";
import type {
  FieldDescription,
  ResearcherStudy,
  StudyIssue,
} from "~/lib/types";

export default function ModifyStudyPage() {
  const navigate = useNavigate();
  const params = useParams();
  const studyId = Number(params.studyId);

  const currentUser = getCurrentUser();
  const researcherId =
    currentUser?.role_id === "researcher" ? currentUser.user_id : null;

  const [study, setStudy] = useState<ResearcherStudy | null>(null);
  const [issues, setIssues] = useState<StudyIssue[]>([]);
  const [availableFields, setAvailableFields] = useState<FieldDescription[]>(
    [],
  );

  const [description, setDescription] = useState("");
  const [requiredFieldIds, setRequiredFieldIds] = useState<number[]>([]);
  const [optionalFieldIds, setOptionalFieldIds] = useState<number[]>([]);
  const [responseComment, setResponseComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingFields, setLoadingFields] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadPage() {
    if (!studyId || Number.isNaN(studyId)) {
      setError("Invalid study ID.");
      setLoading(false);
      setLoadingFields(false);
      return;
    }

    if (!researcherId) {
      setError("You must be signed in as a researcher.");
      setLoading(false);
      setLoadingFields(false);
      return;
    }

    try {
      setLoading(true);
      setLoadingFields(true);
      setError("");
      setMessage("");

      const [studiesResponse, fieldsResponse, issuesResponse] =
        await Promise.all([
          api.getResearcherStudies(researcherId),
          api.getFields(),
          api.getStudyIssues(studyId).catch(() => ({ issues: [] })),
        ]);

      const matchedStudy =
        studiesResponse.studies.find((item) => item.study_id === studyId) ??
        null;

      if (!matchedStudy) {
        setStudy(null);
        setAvailableFields(fieldsResponse.fields);
        setIssues(issuesResponse.issues);
        setError("Study not found.");
        return;
      }

      setStudy(matchedStudy);
      setAvailableFields(fieldsResponse.fields);
      setIssues(issuesResponse.issues);

      setDescription(matchedStudy.description ?? "");
      setRequiredFieldIds(matchedStudy.required_field_ids);
      setOptionalFieldIds(matchedStudy.optional_field_ids);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load study");
    } finally {
      setLoading(false);
      setLoadingFields(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, [studyId, researcherId]);

  function toggleField(fieldId: number, group: "required" | "optional") {
    if (group === "required") {
      setRequiredFieldIds((current) =>
        current.includes(fieldId)
          ? current.filter((id) => id !== fieldId)
          : [...current, fieldId],
      );
      setOptionalFieldIds((current) => current.filter((id) => id !== fieldId));
      return;
    }

    setOptionalFieldIds((current) =>
      current.includes(fieldId)
        ? current.filter((id) => id !== fieldId)
        : [...current, fieldId],
    );
    setRequiredFieldIds((current) => current.filter((id) => id !== fieldId));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!study) {
      return;
    }

    if (!issueId) {
      setError("No issue is available to modify against.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a study description.");
      return;
    }

    if (requiredFieldIds.length === 0) {
      setError("Please select at least one required field.");
      return;
    }

    try {
      setSubmitting(true);

      await api.modifyStudy(studyId, {
        description: description.trim(),
        required_field_ids: requiredFieldIds,
        optional_field_ids: optionalFieldIds,
        comment: responseComment.trim(),
        issue_id: issueId,
      });

      setMessage("Study updated and sent for re-approval.");

      setTimeout(() => {
        navigate(`/researcher/studies/${study.study_id}`);
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to modify study");
    } finally {
      setSubmitting(false);
    }
  }

  const issueCount = issues.length;
  const displayStatus = study
    ? getResearcherDisplayStatus(study.status, issueCount)
    : "awaiting_approval";
  const statusMeta = getResearcherDisplayStatusMeta(displayStatus);
  const latestIssue = issues.length > 0 ? issues[0] : null;
  const issueId = latestIssue?.issue_id ?? 0;
  const flaggedFields = latestIssue?.flagged_fields ?? [];
  const flaggedFieldIds = latestIssue?.flagged_field_ids ?? [];

  return (
    <AppShell
      role="researcher"
      title={study ? `Modify ${study.study_name}` : "Modify Study"}
      subtitle="Update the study details requested by the regulator and resubmit it for approval."
    >
      <SectionHeading
        title="Modify study"
        description="Only the description and requested fields can be changed with the current backend endpoint."
      />

      {loading ? (
        <p className="text-sm text-slate-500">Loading study...</p>
      ) : error && !study ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : !study ? (
        <Card>
          <p className="text-sm text-slate-500">No study found.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="max-w-4xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Current review status
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {statusMeta.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
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
                    No general comment was provided for the latest review item.
                  </p>
                )}

                {flaggedFieldIds.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-slate-900">
                      Fields that need attention
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      These are the fields the regulator specifically flagged as
                      problematic.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {flaggedFields.length > 0
                        ? flaggedFields.map((field) => (
                            <Badge key={field.field_id} tone="warning">
                              {field.name}
                            </Badge>
                          ))
                        : flaggedFieldIds.map((fieldId) => (
                            <Badge key={fieldId} tone="warning">
                              Field {fieldId}
                            </Badge>
                          ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4">
                  <label
                    htmlFor="researcher-response-comment"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Your response notes
                  </label>
                  <textarea
                    id="researcher-response-comment"
                    placeholder="Write a note about how you are addressing the regulator's feedback."
                    value={responseComment}
                    onChange={(e) => setResponseComment(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">
                  No regulator feedback has been raised for this study.
                </p>
              </div>
            )}
          </Card>

          <Card className="max-w-4xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="study-name"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Study name
                </label>
                <Input
                  id="study-name"
                  type="text"
                  value={study.study_name}
                  disabled
                />
                <p className="mt-1 text-sm text-slate-500">
                  Study name cannot be changed with the current backend modify
                  endpoint.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="study-data-duration"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Data collection duration (months)
                  </label>
                  <Input
                    id="study-data-duration"
                    type="text"
                    value={
                      study.data_collection_months
                        ? String(study.data_collection_months)
                        : "-"
                    }
                    disabled
                  />
                </div>

                <div>
                  <label
                    htmlFor="study-research-duration"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Research duration (months)
                  </label>
                  <Input
                    id="study-research-duration"
                    type="text"
                    value={
                      study.research_duration_months
                        ? String(study.research_duration_months)
                        : "-"
                    }
                    disabled
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="study-description"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Description
                </label>
                <textarea
                  id="study-description"
                  placeholder="Update the study description based on regulator feedback."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Required fields
                  </label>
                  <p className="mb-3 text-sm text-slate-500">
                    Participants must keep these fields consented to stay in the
                    study.
                  </p>

                  {loadingFields ? (
                    <p className="text-sm text-slate-500">Loading fields...</p>
                  ) : availableFields.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No fields are currently available.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {availableFields.map((field) => {
                        const isFlagged = flaggedFieldIds.includes(
                          field.field_id,
                        );

                        return (
                          <label
                            key={`required-${field.field_id}`}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                              isFlagged
                                ? "border-amber-300 bg-amber-50"
                                : "border-slate-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={requiredFieldIds.includes(
                                field.field_id,
                              )}
                              onChange={() =>
                                toggleField(field.field_id, "required")
                              }
                              className="mt-1"
                            />
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-slate-900">
                                  {field.field_name}
                                </p>
                                {isFlagged ? (
                                  <Badge tone="warning">
                                    Flagged by regulator
                                  </Badge>
                                ) : null}
                              </div>
                              {field.field_desc ? (
                                <p className="text-sm text-slate-500">
                                  {field.field_desc}
                                </p>
                              ) : null}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Optional fields
                  </label>
                  <p className="mb-3 text-sm text-slate-500">
                    These can be shared voluntarily by participants after
                    joining.
                  </p>

                  {loadingFields ? (
                    <p className="text-sm text-slate-500">Loading fields...</p>
                  ) : availableFields.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No fields are currently available.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {availableFields.map((field) => {
                        const isFlagged = flaggedFieldIds.includes(
                          field.field_id,
                        );

                        return (
                          <label
                            key={`optional-${field.field_id}`}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                              isFlagged
                                ? "border-amber-300 bg-amber-50"
                                : "border-slate-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={optionalFieldIds.includes(
                                field.field_id,
                              )}
                              onChange={() =>
                                toggleField(field.field_id, "optional")
                              }
                              className="mt-1"
                            />
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-slate-900">
                                  {field.field_name}
                                </p>
                                {isFlagged ? (
                                  <Badge tone="warning">
                                    Flagged by regulator
                                  </Badge>
                                ) : null}
                              </div>
                              {field.field_desc ? (
                                <p className="text-sm text-slate-500">
                                  {field.field_desc}
                                </p>
                              ) : null}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Required fields selected: {requiredFieldIds.length}
                <br />
                Optional fields selected: {optionalFieldIds.length}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={submitting || loadingFields}>
                  {submitting ? "Submitting..." : "Save changes and resubmit"}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    navigate(`/researcher/studies/${study.study_id}`)
                  }
                >
                  Cancel
                </Button>
              </div>

              {message ? (
                <p className="text-sm text-emerald-700">{message}</p>
              ) : null}

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            </form>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
