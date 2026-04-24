import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import AppShell from "~/components/layout/AppShell";
import StudyOverviewCard from "~/components/researcher/StudyOverviewCard";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import { getCurrentUser } from "~/lib/auth";
import { getResearcherDisplayStatus } from "~/lib/studyStatus";
import type { ResearcherStudy } from "~/lib/types";

export default function ResearcherDashboard() {
  const navigate = useNavigate();

  const [studies, setStudies] = useState<ResearcherStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentUser = getCurrentUser();
  const researcherId =
    currentUser?.role_id === "researcher" ? currentUser.user_id : null;

  async function loadStudies() {
    if (!researcherId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await api.getResearcherStudies(researcherId);
      setStudies(data.studies);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load studies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudies();
  }, [researcherId]);

  const openCount = studies.filter((study) => study.status === "open").length;
  const ongoingCount = studies.filter(
    (study) => study.status === "ongoing",
  ).length;
  const changesRequestedCount = studies.filter((study) => {
    return (
      getResearcherDisplayStatus(study.status, study.issue_count) ===
      "changes_requested"
    );
  }).length;

  const totalParticipants = studies.reduce(
    (sum, study) => sum + study.participant_count,
    0,
  );

  return (
    <AppShell
      role="researcher"
      title="Researcher Dashboard"
      subtitle="Manage studies, review participation, and access only consented data."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <p className="text-sm text-slate-500">Studies created</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {studies.length}
            </p>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Pending review</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {
                studies.filter(
                  (study) =>
                    getResearcherDisplayStatus(
                      study.status,
                      study.issue_count,
                    ) === "awaiting_approval",
                ).length
              }
            </p>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Changes requested</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {changesRequestedCount}
            </p>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Open studies</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {openCount}
            </p>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Ongoing studies</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {ongoingCount}
            </p>
          </Card>
        </div>

        <Card>
          <p className="text-sm text-slate-500">Total participants</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {totalParticipants}
          </p>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate("/researcher/create-study")}>
            Create study
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate("/researcher/fields")}
          >
            Manage fields
          </Button>
        </div>

        <section>
          <SectionHeading
            title="Your studies"
            description="Open a study to inspect participant counts, review regulator feedback, and access consented data."
          />

          {loading ? (
            <p className="text-sm text-slate-500">Loading your studies...</p>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : studies.length === 0 ? (
            <p className="text-sm text-slate-500">
              You have not created any studies yet.
            </p>
          ) : (
            <div className="space-y-4">
              {studies.map((study) => (
                <StudyOverviewCard
                  key={study.study_id}
                  study={study}
                  onView={() =>
                    navigate(`/researcher/studies/${study.study_id}`)
                  }
                  onModify={() =>
                    navigate(`/researcher/studies/${study.study_id}/modify`)
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