import Badge from "~/components/ui/Badge";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import type { StudyStatus } from "~/lib/types";
import {
  getResearcherDisplayStatus,
  getResearcherDisplayStatusMeta,
} from "~/lib/studyStatus";

interface StudyOverviewCardProps {
  study: {
    study_id: number;
    study_name: string;
    description?: string;
    data_collection_months?: number;
    research_duration_months?: number;
    status: StudyStatus;
    participant_count: number;
    required_field_ids: number[];
    optional_field_ids: number[];
    issue_count?: number;
    reviewed_before?: boolean;
  };
  onView?: () => void;
  onModify?: () => void;
}

export default function StudyOverviewCard({
  study,
  onView,
  onModify,
}: StudyOverviewCardProps) {
  const issueCount = study.issue_count ?? 0;
  const displayStatus = getResearcherDisplayStatus(study.status, issueCount);
  const statusMeta = getResearcherDisplayStatusMeta(displayStatus);

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {study.study_name}
          </h3>

          {study.description ? (
            <p className="mt-1 text-sm text-slate-600">{study.description}</p>
          ) : null}

          <p className="mt-2 text-sm text-slate-600">
            {statusMeta.description}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Required fields: {study.required_field_ids.length}
            {study.optional_field_ids.length > 0
              ? ` | Optional fields: ${study.optional_field_ids.length}`
              : ""}
            {study.data_collection_months
              ? ` | Collection: ${study.data_collection_months} months`
              : ""}
            {study.research_duration_months
              ? ` | Research: ${study.research_duration_months} months`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="purple" onClick={onView}>
          View study
        </Button>

        {displayStatus === "issues_raised" && onModify ? (
          <Button variant="secondary" onClick={onModify}>
            Modify study
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
