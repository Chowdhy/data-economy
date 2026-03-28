import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import AppShell from "~/components/layout/AppShell";
import RequiredFieldsList from "~/components/researcher/RequiredFieldsList";
import Badge from "~/components/ui/Badge";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import type { ResearcherStudy } from "~/lib/types";

export default function ResearcherStudiesPage() {
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

  return (
    <AppShell
      role="researcher"
      title="Studies"
      subtitle="Review each study’s status, field requirements, and participant count."
    >
      <SectionHeading
        title="Study list"
        description="This page gives a more detailed overview of the studies you have created."
      />

      {loading ? (
        <p className="text-sm text-slate-500">Loading studies...</p>
      ) : error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : studies.length === 0 ? (
        <p className="text-sm text-slate-500">
          You have not created any studies yet.
        </p>
      ) : (
        <div className="space-y-4">
          {studies.map((study) => (
            <Card key={study.study_id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {study.title ?? study.study_name}
                  </h2>

                  {study.description ? (
                    <p className="mt-2 text-sm text-slate-600">
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
                      {study.participant_count} participants
                    </Badge>
                  </div>

                  <Button
                    onClick={() =>
                      navigate(`/researcher/studies/${study.study_id}`)
                    }
                  >
                    Open study
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <RequiredFieldsList fieldIds={study.required_field_ids} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
