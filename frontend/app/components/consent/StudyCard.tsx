import Badge from "~/components/ui/Badge";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import {
  getResearcherDisplayStatus,
  getResearcherDisplayStatusMeta,
} from "~/lib/studyStatus";
import { formatDate } from "~/lib/utils";

// Props for the study card component
interface StudyCardProps {
  study: {
    study_id: number;
    study_name: string;
    description?: string;
    duration_months?: number;
    status: string;
    joined_at: string;
    consent_all_fields: boolean;
    consented_field_ids: number[];
  };
  onWithdrawStudy?: () => void;
  onModifyConsent?: () => void;
}

// Displays study details along with consent and status information
export default function StudyCard({
  study,
  onWithdrawStudy,
  onModifyConsent,
}: StudyCardProps) {
  // Get user-friendly study status
  const displayStatus = getResearcherDisplayStatus(study.status);

  //Get label and styling metadata for the status badge
  const statusMeta = getResearcherDisplayStatusMeta(displayStatus);

  // Allow actions only if the study is still open
  const canModifyStudy = displayStatus === "open";

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {study.study_name}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Joined {formatDate(study.joined_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge tone={study.consent_all_fields ? "success" : "warning"}>
            {study.consent_all_fields ? "Full consent" : "Partial consent"}
          </Badge>

          <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm text-slate-600">
          Consented fields: {study.consented_field_ids.length}
        </p>
      </div>

      {canModifyStudy ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="primary" onClick={onModifyConsent}>
            Manage consent
          </Button>

          <Button variant="ghost" onClick={onWithdrawStudy}>
            Leave study
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
