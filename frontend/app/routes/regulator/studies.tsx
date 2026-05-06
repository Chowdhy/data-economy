import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import { api } from "~/lib/api";
import type { RegulatorStudy, StudyStatus } from "~/lib/types";

type Tab = "pending" | "reviewed" | "approved";

function StatusBadge({ status }: { status: StudyStatus }) {
  if (status === "approved" || status === "open" || status === "ongoing") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-700 capitalize">
        {status}
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 capitalize">
      {status}
    </span>
  );
}

function StudyCard({ study }: { study: RegulatorStudy }) {
  const navigate = useNavigate();
  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={study.status} />
            <h2 className="text-lg font-semibold text-slate-900">{study.study_name}</h2>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            {study.description || "No description provided."}
          </p>

          <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <span className="font-medium text-slate-900">Study ID:</span>{" "}
              {study.study_id}
            </div>
            <div>
              <span className="font-medium text-slate-900">Researcher ID:</span>{" "}
              {study.creator_id ?? "Unknown"}
            </div>
            <div>
              <span className="font-medium text-slate-900">Review history:</span>{" "}
              {study.issue_count > 0
                ? `${study.issue_count} issue${study.issue_count === 1 ? "" : "s"} raised`
                : "No previous issues"}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-3">
          <Button onClick={() => navigate(`/regulator/studies/${study.study_id}`)}>
            Open details
          </Button>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{message}</p>
    </Card>
  );
}

export default function RegulatorStudiesPage() {
  const [studies, setStudies] = useState<RegulatorStudy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("pending");

  useEffect(() => {
    async function loadStudies() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.getAllStudies();
        setStudies(response.studies);
      } catch (err) {
        console.error("Failed to load studies", err);
        setError("Could not load studies.");
      } finally {
        setIsLoading(false);
      }
    }
    loadStudies();
  }, []);

  const { pending, reviewed, approved } = useMemo(() => {
    const pending: RegulatorStudy[] = [];
    const reviewed: RegulatorStudy[] = [];
    const approved: RegulatorStudy[] = [];

    for (const s of studies) {
      if (s.status === "pending" && s.latest_issue_status === "open") {
        reviewed.push(s);
      } else if (s.status === "pending") {
        pending.push(s);
      } else {
        approved.push(s);
      }
    }

    return { pending, reviewed, approved };
  }, [studies]);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "pending", label: "Pending", count: pending.length },
    { id: "reviewed", label: "Reviewed", count: reviewed.length },
    { id: "approved", label: "Approved", count: approved.length },
  ];

  const visibleStudies =
    activeTab === "pending" ? pending : activeTab === "reviewed" ? reviewed : approved;

  const emptyMessages: Record<Tab, string> = {
    pending: "No studies are currently awaiting first review.",
    reviewed: "No studies are waiting for researcher changes.",
    approved: "No studies have been approved or rejected yet.",
  };

  return (
    <AppShell
      role="regulator"
      title="Studies"
      subtitle="Browse and manage all studies on the platform."
    >
      <div className="space-y-6">
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  activeTab === tab.id
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <Card>
            <p className="text-sm text-slate-600">Loading studies...</p>
          </Card>
        ) : error ? (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">Unable to load studies</h2>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
          </Card>
        ) : visibleStudies.length === 0 ? (
          <EmptyState message={emptyMessages[activeTab]} />
        ) : (
          <div className="grid gap-4">
            {visibleStudies.map((study) => (
              <StudyCard key={study.study_id} study={study} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
