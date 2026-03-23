import { useEffect, useState } from "react";
import AppShell from "~/components/layout/AppShell";
import ConsentSummary from "~/components/consent/ConsentSummary";
import StudyCard from "~/components/consent/StudyCard";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import type { ParticipantStudy } from "~/lib/types";

export default function ParticipantDashboard() {
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

  async function handleWithdrawFromStudy(studyId: number) {
    try {
      await api.withdrawFromStudy(studyId, participantId);
      await loadStudies();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to withdraw from study",
      );
    }
  }

  useEffect(() => {
    loadStudies();
  }, []);

  const fullConsentCount = studies.filter((s) => s.consent_all_fields).length;
  const partialConsentCount = studies.filter(
    (s) => !s.consent_all_fields,
  ).length;

  return (
    <AppShell
      role="participant"
      title="Participant Dashboard"
      subtitle="Review your studies and manage what data you consent to share."
    >
      <div className="space-y-6">
        <ConsentSummary
          totalStudies={studies.length}
          fullConsentCount={fullConsentCount}
          partialConsentCount={partialConsentCount}
        />

        <section>
          <SectionHeading
            title="Your studies"
            description="A clear view of your current participation and consent status."
          />

          {loading ? (
            <p className="text-sm text-slate-500">Loading your studies...</p>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : studies.length === 0 ? (
            <p className="text-sm text-slate-500">
              You have not joined any studies yet.
            </p>
          ) : (
            <div className="space-y-4">
              {studies.map((study) => (
                <StudyCard
                  key={study.study_id}
                  study={study}
                  onWithdrawStudy={() =>
                    handleWithdrawFromStudy(study.study_id)
                  }
                  onWithdrawConsent={() =>
                    alert(
                      "Wire this button to a consent management form or modal next.",
                    )
                  }
                  onRegrantConsent={() =>
                    alert(
                      "Wire this button to a consent management form or modal next.",
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
