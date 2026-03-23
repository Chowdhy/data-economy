import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import AppShell from "~/components/layout/AppShell";
import StudyOverviewCard from "~/components/researcher/StudyOverviewCard";
import Card from "~/components/ui/Card";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import type { ResearcherStudy } from "~/lib/types";

export default function ResearcherDashboard() {
  const navigate = useNavigate();

  const [studies, setStudies] = useState<ResearcherStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const researcherId = Number(localStorage.getItem("demo_user_id") || "1");

  useEffect(() => {
    async function loadStudies() {
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

    loadStudies();
  }, [researcherId]);

  const approvedCount = studies.filter((s) => s.status === "approved").length;
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
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-sm text-slate-500">Studies created</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {studies.length}
            </p>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Approved studies</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {approvedCount}
            </p>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Total participants</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {totalParticipants}
            </p>
          </Card>
        </div>

        <section>
          <SectionHeading
            title="Your studies"
            description="Open a study to inspect participant counts and consented data."
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
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
