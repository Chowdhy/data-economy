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

  const currentUser = getCurrentUser();
  const participantId =
    currentUser?.role_id === "participant" ? currentUser.user_id : null;

  async function loadData() {
    if (!participantId) {
      setError("No logged-in participant found");
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

  async function handleJoinStudy(studyId: number) {
    if (!participantId) {
      setError("No logged-in participant found");
      return;
    }

    try {
      setJoiningStudyId(studyId);
      setError("");
      setMessage("");
      await api.joinStudy(studyId, participantId);
      setMessage("Study joined successfully.");
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
        description="Joining a study automatically shares all required fields first. Optional fields can be managed later."
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
                      {study.duration_months ? (
                        <Badge tone="neutral">
                          {study.duration_months} months
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

                  <Button
                    type="button"
                    onClick={() => handleJoinStudy(study.study_id)}
                    disabled={joiningStudyId === study.study_id}
                  >
                    {joiningStudyId === study.study_id ? "Joining..." : "Join study"}
                  </Button>
                </div>

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
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
