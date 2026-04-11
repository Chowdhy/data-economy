import Card from "~/components/ui/Card";
import type { RegulatorStudyDetail, StudyStatus } from "~/lib/types";

type StudyReviewSummaryProps = {
  study: RegulatorStudyDetail;
};

function getStatusClasses(status?: StudyStatus) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "open":
      return "bg-emerald-100 text-emerald-800";
    case "rejected":
      return "bg-rose-100 text-rose-800";
    case "ongoing":
      return "bg-slate-100 text-slate-800";
    case "complete":
      return "bg-slate-100 text-slate-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export default function StudyReviewSummary({ study }: StudyReviewSummaryProps) {
  return (
    <Card>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-900">
                {study.study_name}
              </h2>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusClasses(
                  study.status,
                )}`}
              >
                {study.status}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-600">
              {study.description || "No study description provided."}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Study ID
            </p>
            <p className="mt-1 text-sm text-slate-900">{study.study_id}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Researcher ID
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {study.creator_id ?? "Unknown"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Data collection
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {study.data_collection_months ?? "—"} months
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Research duration
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {study.research_duration_months ?? "—"} months
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Required fields
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {study.required_fields.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Optional fields
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {study.optional_fields.length}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
