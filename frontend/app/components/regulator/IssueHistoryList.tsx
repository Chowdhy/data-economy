import Card from "~/components/ui/Card";
import type { StudyIssue } from "~/lib/types";

type IssueHistoryListProps = {
  issues: StudyIssue[];
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function IssueHistoryList({ issues }: IssueHistoryListProps) {
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Existing issues
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Previous regulator feedback for this study.
          </p>
        </div>

        {issues.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-4">
            <p className="text-sm text-slate-600">
              No issues have been raised for this study yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {issues.map((issue) => (
              <div
                key={issue.issue_id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Issue #{issue.issue_id}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Raised {formatDate(issue.created_at)}
                    </p>
                  </div>

                  <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium capitalize text-amber-800">
                    {issue.status}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Comment
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {issue.comment || "No comment provided."}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Flagged fields
                    </p>

                    {issue.flagged_fields && issue.flagged_fields.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {issue.flagged_fields.map((field) => (
                          <span
                            key={field.field_id}
                            className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-800"
                          >
                            {field.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-slate-700">
                        No fields flagged.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
