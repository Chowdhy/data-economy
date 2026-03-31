import { useEffect, useState } from "react";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import { getCurrentUser } from "~/lib/auth";
import type { FieldDescription, ParticipantStudy } from "~/lib/types";
import { titleCase } from "~/lib/utils";

export default function ParticipantStudiesPage() {
  const [studies, setStudies] = useState<ParticipantStudy[]>([]);
  const [availableFields, setAvailableFields] = useState<FieldDescription[]>([]);
  const [draftConsents, setDraftConsents] = useState<Record<number, number[]>>({});
  const [expandedStudyId, setExpandedStudyId] = useState<number | null>(null);
  const [savingStudyId, setSavingStudyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const currentUser = getCurrentUser();
  const participantId =
    currentUser?.role_id === "participant" ? currentUser.user_id : null;

  async function loadStudies() {
    if (!participantId) {
      setError("No logged-in participant found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [studiesData, fieldsData] = await Promise.all([
        api.getParticipantStudies(participantId),
        api.getFields(),
      ]);

      setStudies(studiesData.studies);
      setAvailableFields(fieldsData.fields);
      setDraftConsents(
        Object.fromEntries(
          studiesData.studies.map((study) => [study.study_id, study.consented_field_ids]),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load studies");
    } finally {
      setLoading(false);
    }
  }

  function getFields(fieldIds: number[]) {
    return availableFields.filter((field) => fieldIds.includes(field.field_id));
  }

  function toggleConsent(studyId: number, fieldId: number) {
    setDraftConsents((current) => {
      const currentFields = current[studyId] || [];

      return {
        ...current,
        [studyId]: currentFields.includes(fieldId)
          ? currentFields.filter((id) => id !== fieldId)
          : [...currentFields, fieldId],
      };
    });
  }

  async function handleSave(study: ParticipantStudy) {
    if (!participantId) {
      setError("No logged-in participant found");
      return;
    }

    const consentedFieldIds = draftConsents[study.study_id] || [];

    try {
      setSavingStudyId(study.study_id);
      setError("");
      setMessage("");

      const response = await api.modifyConsent(
        study.study_id,
        participantId,
        consentedFieldIds,
      );

      if (response.message === "withdrawn from study due to removing required fields") {
        setMessage(
          `${study.study_name}: removing a required field withdrew you from the study.`,
        );
      } else {
        setMessage(`${study.study_name}: consent saved successfully.`);
      }

      await loadStudies();
      if (expandedStudyId === study.study_id) {
        setExpandedStudyId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update consent");
    } finally {
      setSavingStudyId(null);
    }
  }

  useEffect(() => {
    loadStudies();
  }, [participantId]);

  return (
    <AppShell
      role="participant"
      title="My Studies"
      subtitle="Review the fields each study can access and update your consent while the study is open."
    >
      <SectionHeading
        title="Study consent details"
        description="Required fields keep you enrolled. Optional fields can be toggled on or off while the study is open."
      />

      {message ? <p className="mb-4 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading studies...</p>
      ) : studies.length === 0 ? (
        <p className="text-sm text-slate-500">
          You have not joined any studies yet.
        </p>
      ) : (
        <div className="space-y-4">
          {studies.map((study) => {
            const requiredFields = getFields(study.required_field_ids);
            const optionalFields = getFields(study.optional_field_ids);
            const selectedFieldIds = draftConsents[study.study_id] || [];
            const canModify = study.status === "open";
            const isExpanded = expandedStudyId === study.study_id;

            return (
              <Card key={study.study_id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {study.study_name}
                    </h2>

                    {study.description ? (
                      <p className="mt-1 text-sm text-slate-600">
                        {study.description}
                      </p>
                    ) : null}

                    <p className="mt-2 text-sm text-slate-500">
                      Status: {titleCase(study.status)}
                      {study.duration_months
                        ? ` | Duration: ${study.duration_months} months`
                        : ""}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Current consent: {selectedFieldIds.length} of{" "}
                      {study.required_field_ids.length + study.optional_field_ids.length}{" "}
                      fields
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setExpandedStudyId(isExpanded ? null : study.study_id)
                    }
                  >
                    {isExpanded ? "Hide editor" : "Modify consent"}
                  </Button>
                </div>

                {isExpanded ? (
                  <div className="mt-5 space-y-5 border-t border-slate-200 pt-5">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Required fields
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Removing any required field will withdraw you from the study.
                      </p>

                      <div className="mt-3 space-y-2">
                        {requiredFields.map((field) => (
                          <label
                            key={field.field_id}
                            className="flex items-start gap-3 rounded-xl border border-slate-200 p-3"
                          >
                            <input
                              type="checkbox"
                              checked={selectedFieldIds.includes(field.field_id)}
                              onChange={() =>
                                toggleConsent(study.study_id, field.field_id)
                              }
                              disabled={!canModify}
                              className="mt-1"
                            />
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {field.field_name}
                              </p>
                              {field.field_desc ? (
                                <p className="text-sm text-slate-500">
                                  {field.field_desc}
                                </p>
                              ) : null}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Optional fields
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Optional fields can be shared when you are comfortable doing so.
                      </p>

                      <div className="mt-3 space-y-2">
                        {optionalFields.length === 0 ? (
                          <p className="text-sm text-slate-500">
                            This study does not request any optional fields.
                          </p>
                        ) : (
                          optionalFields.map((field) => (
                            <label
                              key={field.field_id}
                              className="flex items-start gap-3 rounded-xl border border-slate-200 p-3"
                            >
                              <input
                                type="checkbox"
                                checked={selectedFieldIds.includes(field.field_id)}
                                onChange={() =>
                                  toggleConsent(study.study_id, field.field_id)
                                }
                                disabled={!canModify}
                                className="mt-1"
                              />
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {field.field_name}
                                </p>
                                {field.field_desc ? (
                                  <p className="text-sm text-slate-500">
                                    {field.field_desc}
                                  </p>
                                ) : null}
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </div>

                    {!canModify ? (
                      <p className="text-sm text-amber-700">
                        Consent can only be changed while the study status is Open.
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        onClick={() => handleSave(study)}
                        disabled={!canModify || savingStudyId === study.study_id}
                      >
                        {savingStudyId === study.study_id
                          ? "Saving..."
                          : "Save consent"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setDraftConsents((current) => ({
                            ...current,
                            [study.study_id]: study.consented_field_ids,
                          }))
                        }
                        disabled={savingStudyId === study.study_id}
                      >
                        Reset changes
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
