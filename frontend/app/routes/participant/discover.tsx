import { useEffect, useState } from "react";
import AppShell from "~/components/layout/AppShell";
import Badge from "~/components/ui/Badge";
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
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Which study card is expanded for consent selection
  const [expandedStudyId, setExpandedStudyId] = useState<number | null>(null);
  // Selected optional field IDs per study (required fields are always included)
  const [selectedOptional, setSelectedOptional] = useState<Record<number, number[]>>({});

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

  function handleExpandStudy(study: AvailableStudy) {
    setExpandedStudyId(study.study_id);
    setSelectedOptional((prev) => ({
      ...prev,
      [study.study_id]: prev[study.study_id] ?? [],
    }));
    setError("");
    setMessage("");
    api.logStudyView(study.study_id).catch(() => {});
  }

  function toggleOptional(studyId: number, fieldId: number) {
    setSelectedOptional((prev) => {
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

    const optionalIds = selectedOptional[study.study_id] ?? [];
    const consentedFieldIds = [...study.required_field_ids, ...optionalIds];

    try {
      setJoiningStudyId(study.study_id);
      setError("");
      setMessage("");
      await api.joinStudy(study.study_id, participantId, consentedFieldIds);
      setMessage(`Joined "${study.study_name}" successfully.`);
      setExpandedStudyId(null);
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
    <AppShell
      role="participant"
      title="Join Studies"
      subtitle="Browse open studies and join the ones that match what you are comfortable sharing."
    >
      <SectionHeading
        title="Available studies"
        description="Choose which optional fields to share when joining. Required fields must be consented to in order to participate."
      />

      {message ? <p className="mb-4 text-sm text-emerald-700">{message}</p> : null}
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
            const isExpanded = expandedStudyId === study.study_id;
            const isJoining = joiningStudyId === study.study_id;
            const optionalSelected = selectedOptional[study.study_id] ?? [];

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

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone="neutral">{study.status}</Badge>
                      {study.data_collection_months ? (
                        <Badge tone="neutral">
                          {study.data_collection_months} months
                        </Badge>
                      ) : null}
                      <Badge tone="success">
                        {requiredFields.length} required fields
                      </Badge>
                      {optionalFields.length > 0 ? (
                        <Badge tone="neutral">
                          {optionalFields.length} optional fields
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  {!isExpanded ? (
                    <Button
                      type="button"
                      onClick={() => handleExpandStudy(study)}
                    >
                      Join study
                    </Button>
                  ) : null}
                </div>

                {isExpanded ? (
                  <div className="mt-5 space-y-5 border-t border-slate-200 pt-5">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Required fields
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        These fields are mandatory. You must consent to all of them to join.
                      </p>
                      <div className="mt-3 space-y-2">
                        {requiredFields.length === 0 ? (
                          <p className="text-sm text-slate-500">No required fields.</p>
                        ) : (
                          requiredFields.map((field) => (
                            <div
                              key={field.field_id}
                              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                            >
                              <input
                                type="checkbox"
                                checked
                                disabled
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
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {optionalFields.length > 0 ? (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Optional fields
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          You can choose which optional fields to share. These can be changed later.
                        </p>
                        <div className="mt-3 space-y-2">
                          {optionalFields.map((field) => (
                            <label
                              key={field.field_id}
                              className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3"
                            >
                              <input
                                type="checkbox"
                                checked={optionalSelected.includes(field.field_id)}
                                onChange={() => toggleOptional(study.study_id, field.field_id)}
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
                    ) : null}

                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => handleConfirmJoin(study)}
                        disabled={isJoining}
                      >
                        {isJoining ? "Joining..." : "Confirm & join"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setExpandedStudyId(null)}
                        disabled={isJoining}
                      >
                        Cancel
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
