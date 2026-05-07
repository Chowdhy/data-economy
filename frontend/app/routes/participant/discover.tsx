import { useEffect, useState } from "react";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import { getCurrentUser } from "~/lib/auth";
import type { AvailableStudy, FieldDescription } from "~/lib/types";

export default function ParticipantDiscoverPage() {
  const [studies, setStudies] = useState<AvailableStudy[]>([]);
  const [fields, setFields] = useState<FieldDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningStudyId, setJoiningStudyId] = useState<number | null>(null);
  const [consentingStudyId, setConsentingStudyId] = useState<number | null>(
    null,
  );
  const [selectedOptionals, setSelectedOptionals] = useState<
    Record<number, number[]>
  >({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const currentUser = getCurrentUser();
  const participantId =
    currentUser?.role_id === "participant" ? currentUser.user_id : null;

  async function loadData() {
    if (!participantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [studyResponse, fieldResponse] = await Promise.all([
        api.getAvailableStudies(participantId),
        api.getFields(),
      ]);

      setStudies(studyResponse.studies);
      setFields(fieldResponse.fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load studies");
    } finally {
      setLoading(false);
    }
  }

  function getFieldNames(fieldIds: number[]) {
    return fields.filter((field) => fieldIds.includes(field.field_id));
  }

  function openConsentForm(study: AvailableStudy) {
    setSelectedOptionals((prev) => ({ ...prev, [study.study_id]: [] }));
    setConsentingStudyId(study.study_id);
    setError("");
    setMessage("");
  }

  function toggleOptional(studyId: number, fieldId: number) {
    setSelectedOptionals((prev) => {
      const current = prev[studyId] ?? [];
      return {
        ...prev,
        [studyId]: current.includes(fieldId)
          ? current.filter((id) => id !== fieldId)
          : [...current, fieldId],
      };
    });
  }

  async function handleConfirmJoin(study: AvailableStudy) {
    if (!participantId) return;

    const optionalSelections = selectedOptionals[study.study_id] ?? [];
    const allConsentedIds = [
      ...study.required_field_ids,
      ...optionalSelections,
    ];

    try {
      setJoiningStudyId(study.study_id);
      setError("");
      setMessage("");

      await api.joinStudy(study.study_id, participantId);
      await api.modifyConsent(study.study_id, participantId, allConsentedIds);

      setMessage("Study joined successfully.");
      setConsentingStudyId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join study");
    } finally {
      setJoiningStudyId(null);
    }
  }

  useEffect(() => {
    loadData();
  }, [participantId]);

  return (
    <AppShell role="participant" title="Join Studies">
      <SectionHeading
        title="Available studies"
        description="Review which fields each study requires before joining. You can also consent to optional fields now or manage them later."
      />

      {message ? (
        <p className="mb-4 text-sm text-emerald-700">{message}</p>
      ) : null}
      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading open studies...</p>
      ) : studies.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            No open studies are currently available for you to join.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {studies.map((study) => {
            const requiredFields = getFieldNames(study.required_field_ids);
            const optionalFields = getFieldNames(study.optional_field_ids);
            const isConsenting = consentingStudyId === study.study_id;
            const optionalSelections =
              selectedOptionals[study.study_id] ?? [];

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
                  </div>

                  {!isConsenting ? (
                    <Button
                      type="button"
                      onClick={() => openConsentForm(study)}
                      disabled={joiningStudyId === study.study_id}
                    >
                      Join study
                    </Button>
                  ) : null}
                </div>

                {!isConsenting ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Required fields
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {requiredFields.map((field) => (
                          <span
                            key={`${study.study_id}-required-${field.field_id}`}
                            className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700"
                          >
                            {field.field_name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Optional fields
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {optionalFields.length > 0 ? (
                          optionalFields.map((field) => (
                            <span
                              key={`${study.study_id}-optional-${field.field_id}`}
                              className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                            >
                              {field.field_name}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">
                            No optional fields.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 space-y-5 border-t border-slate-200 pt-5">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Required fields
                      </h3>
                      <p className="mt-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        You must consent to these fields to join this study.
                      </p>
                      <div className="mt-3 space-y-2">
                        {requiredFields.map((field) => (
                          <div
                            key={field.field_id}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <p className="text-sm font-medium text-slate-900">
                              {field.field_name}
                            </p>
                            {field.field_desc ? (
                              <p className="mt-0.5 text-sm text-slate-500">
                                {field.field_desc}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>

                    {optionalFields.length > 0 ? (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Optional fields
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          These fields are optional. You can consent to them now
                          or manage them later from My Studies.
                        </p>
                        <div className="mt-3 space-y-2">
                          {optionalFields.map((field) => (
                            <label
                              key={field.field_id}
                              className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3"
                            >
                              <input
                                type="checkbox"
                                checked={optionalSelections.includes(
                                  field.field_id,
                                )}
                                onChange={() =>
                                  toggleOptional(study.study_id, field.field_id)
                                }
                                className="mt-1"
                              />
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {field.field_name}
                                </p>
                                {field.field_desc ? (
                                  <p className="mt-0.5 text-sm text-slate-500">
                                    {field.field_desc}
                                  </p>
                                ) : null}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        onClick={() => handleConfirmJoin(study)}
                        disabled={joiningStudyId === study.study_id}
                      >
                        {joiningStudyId === study.study_id
                          ? "Joining..."
                          : "Confirm & join"}
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setConsentingStudyId(null)}
                        disabled={joiningStudyId === study.study_id}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
