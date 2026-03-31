import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import AppShell from "~/components/layout/AppShell";
import ConsentSummary from "~/components/consent/ConsentSummary";
import StudyCard from "~/components/consent/StudyCard";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import type { ParticipantStudy } from "~/lib/types";
import { getCurrentUser } from "~/lib/auth";

export default function ParticipantDashboard() {
  const navigate = useNavigate();
  const [studies, setStudies] = useState<ParticipantStudy[]>([]);
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
      const data = await api.getParticipantStudies(participantId);
      setStudies(data.studies);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load studies");
    } finally {
      setLoading(false);
    }
  }

  async function handleWithdrawFromStudy(studyId: number) {
    if (!participantId) {
      setError("No logged-in participant found");
      return;
    }

    try {
      setError("");
      await api.withdrawFromStudy(studyId, participantId);
      await loadStudies();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to withdraw from study"
      );
    }
  }

  useEffect(() => {
    loadStudies();
  }, [participantId]);

  const fullConsentCount = studies.filter((s) => s.consent_all_fields).length;
  const partialConsentCount = studies.filter(
    (s) => !s.consent_all_fields
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

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">
              Discover open studies
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Browse studies you can join and review the required information before opting in.
            </p>
            <Button className="mt-4" onClick={() => navigate("/participant/discover")}>
              Find studies
            </Button>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-slate-900">
              Update your answers
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Keep your saved participant data current so studies can use your latest information.
            </p>
            <Button
              className="mt-4"
              variant="secondary"
              onClick={() => navigate("/participant/profile")}
            >
              Edit answers
            </Button>
          </Card>
        </div>

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
                  onModifyConsent={() => navigate("/participant/studies")}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
