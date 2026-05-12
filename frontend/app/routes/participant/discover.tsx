import { useEffect, useState } from "react";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import { getCurrentUser } from "~/lib/auth";
import type {
  AvailableStudy,
  FieldDescription,
  ParticipantAnswerField,
} from "~/lib/types";

/**
 * Participant study discovery page
 * Shows open studies available to join with details on required and optional fields
 * Participant can join study
 */

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
  const [studyAnswerFields, setStudyAnswerFields] = useState<
    ParticipantAnswerField[]
  >([]);
  const [pendingAnswers, setPendingAnswers] = useState<Record<number, string>>(
    {},
  );
  const [loadingAnswers, setLoadingAnswers] = useState(false);

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

  async function openConsentForm(study: AvailableStudy) {
    setSelectedOptionals((prev) => ({ ...prev, [study.study_id]: [] }));
    setConsentingStudyId(study.study_id);
    setError("");
    setMessage("");
    setPendingAnswers({});
    setStudyAnswerFields([]);
    setLoadingAnswers(true);

    try {
      if (participantId) {
        const response = await api.getParticipantAnswers(participantId);
        setStudyAnswerFields(response.answers);
        const initial: Record<number, string> = {};
        for (const fieldId of study.required_field_ids) {
          const existing = response.answers.find((a) => a.field_id === fieldId);
          initial[fieldId] = existing?.answer ?? "";
        }
        setPendingAnswers(initial);
      }
    } catch {
      // proceed with empty state; user can still fill in answers
    } finally {
      setLoadingAnswers(false);
    }
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

    const missingFields = study.required_field_ids.filter(
      (id) => !pendingAnswers[id]?.trim(),
    );
    if (missingFields.length > 0) {
      setError("Please fill in all required fields before joining.");
      return;
    }

    const optionalSelections = selectedOptionals[study.study_id] ?? [];
    const allConsentedIds = [
      ...study.required_field_ids,
      ...optionalSelections,
    ];

    try {
      setJoiningStudyId(study.study_id);
      setError("");
      setMessage("");

      const answersToSave = study.required_field_ids.map((id) => {
        const field = studyAnswerFields.find((a) => a.field_id === id);
        return {
          field_id: id,
          field_name: field?.field_name ?? String(id),
          answer: pendingAnswers[id] ?? "",
        };
      });
      await api.saveAnswers(participantId, answersToSave);

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
            const optionalSelections = selectedOptionals[study.study_id] ?? [];

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
                        You must consent to these fields and provide answers to
                        join this study.
                      </p>
                      <div className="mt-3 space-y-3">
                        {requiredFields.map((field) => {
                          const answerField = studyAnswerFields.find(
                            (a) => a.field_id === field.field_id,
                          );
                          const currentValue =
                            pendingAnswers[field.field_id] ?? "";
                          const isMissing = !currentValue.trim();

                          return (
                            <div
                              key={field.field_id}
                              className={`rounded-xl border p-3 ${isMissing ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-slate-50"}`}
                            >
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-slate-900">
                                  {field.field_name}
                                </p>
                                {isMissing && !loadingAnswers ? (
                                  <span className="text-xs text-rose-600">
                                    required
                                  </span>
                                ) : null}
                              </div>
                              {field.field_desc ? (
                                <p className="mt-0.5 text-sm text-slate-500">
                                  {field.field_desc}
                                </p>
                              ) : null}
                              {loadingAnswers ? (
                                <p className="mt-2 text-sm text-slate-400">
                                  Loading...
                                </p>
                              ) : answerField?.field_type === "enum" ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {answerField.options.map((opt) => (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() =>
                                        setPendingAnswers((prev) => ({
                                          ...prev,
                                          [field.field_id]: opt,
                                        }))
                                      }
                                      className={`rounded-full border px-3 py-1 text-sm ${
                                        currentValue === opt
                                          ? "border-emerald-600 bg-emerald-600 text-white"
                                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  value={currentValue}
                                  onChange={(e) =>
                                    setPendingAnswers((prev) => ({
                                      ...prev,
                                      [field.field_id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Enter your answer"
                                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                                />
                              )}
                            </div>
                          );
                        })}
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
                        disabled={
                          joiningStudyId === study.study_id ||
                          loadingAnswers ||
                          study.required_field_ids.some(
                            (id) => !pendingAnswers[id]?.trim(),
                          )
                        }
                      >
                        {joiningStudyId === study.study_id
                          ? "Joining..."
                          : "Confirm & join"}
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setConsentingStudyId(null);
                          setPendingAnswers({});
                          setStudyAnswerFields([]);
                        }}
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
