import { useEffect, useState } from "react";
import AppShell from "~/components/layout/AppShell";
import ConsentFieldList from "~/components/consent/ConsentFieldList";
import Card from "~/components/ui/Card";
import SectionHeading from "~/components/ui/SectionHeading";
import Button from "~/components/ui/Button";
import { api } from "~/lib/api";
import { getCurrentUser } from "~/lib/auth";
import type { FieldDescription, ParticipantStudy } from "~/lib/types";

export default function ParticipantStudiesPage() {
  const [studies, setStudies] = useState<ParticipantStudy[]>([]);
  const [availableFields, setAvailableFields] = useState<FieldDescription[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load studies");
    } finally {
      setLoading(false);
    }
  }

  function getConsentedFields(fieldIds: number[]) {
    return availableFields.filter((field) => fieldIds.includes(field.field_id));
  }

  useEffect(() => {
    loadStudies();
  }, [participantId]);

  return (
    <AppShell
      role="participant"
      title="My Studies"
      subtitle="See the fields you currently consent to share for each study."
    >
      <SectionHeading
        title="Study consent details"
        description="You should always be able to see and manage your consent clearly."
      />

      {loading ? (
        <p className="text-sm text-slate-500">Loading studies...</p>
      ) : error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : studies.length === 0 ? (
        <p className="text-sm text-slate-500">
          You have not joined any studies yet.
        </p>
      ) : (
        <div className="space-y-4">
          {studies.map((study) => {
            const consentedFields = getConsentedFields(
              study.consented_field_ids,
            );

            return (
              <Card key={study.study_id}>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {study.study_name}
                  </h2>

                  {study.description ? (
                    <p className="mt-1 text-sm text-slate-600">
                      {study.description}
                    </p>
                  ) : null}

                  <p className="mt-1 text-sm text-slate-600">
                    Status: {study.status}
                    {study.duration_months
                      ? ` • Duration: ${study.duration_months} months`
                      : ""}
                  </p>
                </div>

                <ConsentFieldList fields={consentedFields} />

                {/* ✅ New single button */}
                <div className="mt-4">
                  <Button type="button" variant="secondary">
                    Modify Consent
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
