import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import AppShell from "~/components/layout/AppShell";
import Badge from "~/components/ui/Badge";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import { getCurrentUser } from "~/lib/auth";
import {
  getResearcherDisplayStatus,
  getResearcherDisplayStatusMeta,
} from "~/lib/studyStatus";
import type { FieldDescription, ResearcherStudy } from "~/lib/types";

export default function ResearcherStudiesPage() {
  const navigate = useNavigate();

  const [studies, setStudies] = useState<ResearcherStudy[]>([]);
  const [availableFields, setAvailableFields] = useState<FieldDescription[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentUser = getCurrentUser();
  const researcherId =
    currentUser?.role_id === "researcher" ? currentUser.user_id : null;

  useEffect(() => {
    async function loadData() {
      if (!researcherId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [studiesData, fieldsData] = await Promise.all([
          api.getResearcherStudies(researcherId),
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

    loadData();
  }, [researcherId]);

  function getRequiredFields(fieldIds: number[]) {
    return availableFields.filter((field) => fieldIds.includes(field.field_id));
  }

  return (
    <AppShell
      role="researcher"
      title="Studies"
      subtitle="Review each study's approval status, requested changes, field requirements, and participant count."
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
          {studies.map((study) => {
            const requiredFields = getRequiredFields(study.required_field_ids);
            const displayStatus = getResearcherDisplayStatus(
              study.status,
              study.issue_count,
            );
            const statusMeta = getResearcherDisplayStatusMeta(displayStatus);

            return (
              <Card key={study.study_id}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {study.study_name}
                    </h2>

                    {study.description ? (
                      <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                        {study.description}
                      </p>
                    ) : null}

                    <p className="mt-2 text-sm text-slate-500">
                      {statusMeta.description}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                    <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>

                    <Badge tone="neutral">
                      {study.participant_count} participant
                      {study.participant_count === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {study.data_collection_months ? (
                    <Badge tone="neutral">
                      Collection: {study.data_collection_months} months
                    </Badge>
                  ) : null}

                  {study.research_duration_months ? (
                    <Badge tone="neutral">
                      Research: {study.research_duration_months} months
                    </Badge>
                  ) : null}

                  {study.optional_field_ids.length > 0 ? (
                    <Badge tone="neutral">
                      {study.optional_field_ids.length} optional field
                      {study.optional_field_ids.length === 1 ? "" : "s"}
                    </Badge>
                  ) : null}

                  {study.issue_count > 0 ? (
                    <Badge tone="danger">
                      {study.issue_count} review{" "}
                      {study.issue_count === 1 ? "item" : "items"}
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant="purple"
                    onClick={() =>
                      navigate(`/researcher/studies/${study.study_id}`)
                    }
                  >
                    View study
                  </Button>

                  {displayStatus === "issues_raised" && study.has_open_issue ? (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        navigate(`/researcher/studies/${study.study_id}/modify`)
                      }
                    >
                      Modify study
                    </Button>
                  ) : null}
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Required fields
                  </p>

                  {requiredFields.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {requiredFields.map((field) => (
                        <span
                          key={field.field_id}
                          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          {field.field_name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      No required fields.
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
