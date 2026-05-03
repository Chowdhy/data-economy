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

  const pendingReviewCount = studies.filter((study) => {
    return (
      getResearcherDisplayStatus(study.status, study.issue_count) === "pending"
    );
  }).length;

  const issuesRaisedCount = studies.filter((study) => {
    return (
      getResearcherDisplayStatus(study.status, study.issue_count) ===
      "issues_raised"
    );
  }).length;

  const openCount = studies.filter((study) => study.status === "open").length;

  const ongoingCount = studies.filter(
    (study) => study.status === "ongoing",
  ).length;

  return (
    <AppShell
      role="researcher"
      title="Researcher Dashboard"
      subtitle="Manage studies, review participation, and access only consented data."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <p className="text-sm text-slate-500">Pending review</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {pendingReviewCount}
            </p>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Issues raised</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {issuesRaisedCount}
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
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Study Status Key
            </p>
          </div>

          <div className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-100">
            <div className="grid gap-2 px-4 py-3 sm:grid-cols-[180px_1fr] sm:items-center">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                <p className="text-sm font-semibold text-slate-900">Pending</p>
              </div>
              <p className="text-sm text-slate-500">Awaiting approval</p>
            </div>

            <div className="grid gap-2 px-4 py-3 sm:grid-cols-[180px_1fr] sm:items-center">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                <p className="text-sm font-semibold text-slate-900">
                  Issues raised
                </p>
              </div>
              <p className="text-sm text-slate-500">
                Regulator has raised issues
              </p>
            </div>

            <div className="grid gap-2 px-4 py-3 sm:grid-cols-[180px_1fr] sm:items-center">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-purple-500" />
                <p className="text-sm font-semibold text-slate-900">Open</p>
              </div>
              <p className="text-sm text-slate-500">
                Open for participants to join
              </p>
            </div>

            <div className="grid gap-2 px-4 py-3 sm:grid-cols-[180px_1fr] sm:items-center">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
                <p className="text-sm font-semibold text-slate-900">Ongoing</p>
              </div>
              <p className="text-sm text-slate-500">
                Research data is available for analysis
              </p>
            </div>

            <div className="grid gap-2 px-4 py-3 sm:grid-cols-[180px_1fr] sm:items-center">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-400" />
                <p className="text-sm font-semibold text-slate-900">Rejected</p>
              </div>
              <p className="text-sm text-slate-500">Rejected and inactive</p>
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate("/researcher/create-study")}>
            Create study
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
