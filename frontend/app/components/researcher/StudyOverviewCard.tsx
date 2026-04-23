import Badge from "~/components/ui/Badge";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import type { StudyStatus } from "~/lib/types";

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
  };
  onView?: () => void;
}

function getStatusTone(status: StudyStatus) {
  switch (status) {
    case "pending":
      return "warning"; // amber
    case "rejected":
      return "danger"; // red
    case "open":
      return "success"; // green
    case "ongoing":
      return "purple"; // custom
    case "approved":
      return "info"; // blue
    case "complete":
    case "closed":
      return "neutral"; // grey
    default:
      return "neutral";
  }
}

export default function StudyOverviewCard({
  study,
  onView,
}: StudyOverviewCardProps) {
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

          <p className="mt-1 text-sm text-slate-500">
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
          <Badge tone={getStatusTone(study.status)}>{study.status}</Badge>
          <Badge tone="neutral">{study.participant_count} participants</Badge>
        </div>
      </div>

      <div className="mt-4">
        <Button variant="purple" onClick={onView}>
          View study
        </Button>
      </div>
    </Card>
  );
}
