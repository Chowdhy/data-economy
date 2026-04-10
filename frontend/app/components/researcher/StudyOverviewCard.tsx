import Badge from "~/components/ui/Badge";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";

interface StudyOverviewCardProps {
  study: {
    study_id: number;
    study_name: string;
    description?: string;
    data_collection_months?: number;
    research_duration_months?: number;
    status: string;
    participant_count: number;
    required_field_ids: number[];
    optional_field_ids: number[];
  };
  onView?: () => void;
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
          <Badge tone="neutral">{study.status}</Badge>
          <Badge tone="success">{study.participant_count} participants</Badge>
        </div>
      </div>

      <div className="mt-4">
        <Button onClick={onView}>View study</Button>
      </div>
    </Card>
  );
}
