import { useEffect, useState } from "react";
import AppShell from "~/components/layout/AppShell";
import ConsentFieldList from "~/components/consent/ConsentFieldList";
import Card from "~/components/ui/Card";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import type { ParticipantStudy } from "~/lib/types";

export default function ParticipantStudiesPage() {
  const [studies, setStudies] = useState<ParticipantStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const participantId = Number(localStorage.getItem("demo_user_id") || "1");

  async function loadStudies() {
    try {
      setLoading(true);
      setError("");
      const data = await api.getParticipantStudies(participantId);
      setStudies(data.studies);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load studies");
    } finally {
      setLoading(false);
    }
  }

  async function handleWithdrawConsent(studyId: number, fieldIds: number[]) {
    if (fieldIds.length === 0) return;

    try {
      await api.withdrawConsentFields(studyId, participantId, [fieldIds[0]]);
      await loadStudies();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to withdraw consent",
      );
    }
  }

  async function handleRegrantConsent(
    studyId: number,
    currentFieldIds: number[],
  ) {
    if (currentFieldIds.length === 0) {
      setError(
        "This demo page can only regrant fields that you choose explicitly. Add a field picker next.",
      );
      return;
    }

    try {
      await api.regrantConsentFields(studyId, participantId, [
        currentFieldIds[0],
      ]);
      await loadStudies();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to regrant consent",
      );
    }
  }

  useEffect(() => {
    loadStudies();
  }, []);

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
          {studies.map((study) => (
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

              <ConsentFieldList
                fieldIds={study.consented_field_ids}
                onWithdraw={() =>
                  handleWithdrawConsent(
                    study.study_id,
                    study.consented_field_ids,
                  )
                }
                onRegrant={() =>
                  handleRegrantConsent(
                    study.study_id,
                    study.consented_field_ids,
                  )
                }
              />
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
