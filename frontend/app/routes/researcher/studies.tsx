import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import AppShell from "~/components/layout/AppShell";
import RequiredFieldsList from "~/components/researcher/RequiredFieldsList";
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
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {study.study_name}
                    </h2>

                    {study.description ? (
                      <p className="mt-2 text-sm text-slate-600">
                        {study.description}
                      </p>
                    ) : null}

                    <p className="mt-2 text-sm text-slate-600">
                      {statusMeta.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>

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

                      <Badge tone="success">
                        {study.participant_count} participant
                        {study.participant_count === 1 ? "" : "s"}
                      </Badge>

                      {study.issue_count > 0 ? (
                        <Badge tone="danger">
                          {study.issue_count} review{" "}
                          {study.issue_count === 1 ? "item" : "items"}
                        </Badge>
                      ) : null}
                    </div>

                    <Button
                      variant="purple"
                      className="mt-3"
                      onClick={() =>
                        navigate(`/researcher/studies/${study.study_id}`)
                      }
                    >
                      View study
                    </Button>

                    {displayStatus === "changes_requested" &&
                    study.has_open_issue ? (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          navigate(
                            `/researcher/studies/${study.study_id}/modify`,
                          )
                        }
                      >
                        Modify study
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4">
                  <RequiredFieldsList fields={requiredFields} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
