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

                  {issue.modification ? (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Researcher response
                        </p>

                        {issue.modification.comment ? (
                          <p className="mt-2 text-sm text-slate-700">
                            {issue.modification.comment}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-slate-700">
                            No response comment provided.
                          </p>
                        )}
                      </div>

                      {issue.modification.required_field_changes.length > 0 ? (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-slate-900">
                            Required field changes
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {issue.modification.required_field_changes.map(
                              (field) => (
                                <span
                                  key={`required-${field.field_id}-${field.modification_type}`}
                                  className={
                                    field.modification_type === "add"
                                      ? "inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"
                                      : "inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700"
                                  }
                                >
                                  {field.modification_type === "add"
                                    ? `+ ${field.name}`
                                    : `- ${field.name}`}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      ) : null}

                      {issue.modification.optional_field_changes.length > 0 ? (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-slate-900">
                            Optional field changes
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {issue.modification.optional_field_changes.map(
                              (field) => (
                                <span
                                  key={`optional-${field.field_id}-${field.modification_type}`}
                                  className={
                                    field.modification_type === "add"
                                      ? "inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"
                                      : "inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700"
                                  }
                                >
                                  {field.modification_type === "add"
                                    ? `+ ${field.name}`
                                    : `- ${field.name}`}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
