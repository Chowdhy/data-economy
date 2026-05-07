import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import { api } from "~/lib/api";
import type { ActivityLog } from "~/lib/types";

const ACTION_LABELS: Record<string, string> = {
  study_created: "created this study",
  study_approved: "approved this study",
  study_rejected: "rejected this study",
  study_modified: "submitted modifications to this study",
  issue_raised: "raised issues on this study",
  participant_joined: "joined this study",
  participant_withdrew: "withdrew from this study",
  consent_modified: "updated their consent for this study",
};

function formatLogEntry(log: ActivityLog): string {
  const actor = log.user_name ?? (log.user_id ? `User #${log.user_id}` : "System");
  const action = ACTION_LABELS[log.action] ?? log.action.replace(/_/g, " ");
  return `${actor} ${action}`;
}

export default function RegulatorStudyLogsPage() {
  const navigate = useNavigate();
  const { studyId } = useParams();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [studyName, setStudyName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!studyId) return;
      setIsLoading(true);
      setError(null);
      try {
        const [logsResponse, studyResponse] = await Promise.all([
          api.getStudyLogs(Number(studyId)),
          api.getRegulatorStudyDetail(Number(studyId)),
        ]);
        setLogs(logsResponse.logs);
        setStudyName(studyResponse.study_name);
      } catch (err) {
        console.error("Failed to load logs", err);
        setError("Could not load activity logs for this study.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [studyId]);

  return (
    <AppShell
      role="regulator"
      title="Study Logs"
      subtitle={studyName ?? undefined}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate(`/regulator/studies/${studyId}`)}
          >
            Back to study
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <p className="text-sm text-slate-600">Loading logs...</p>
          </Card>
        ) : error ? (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">
              Unable to load logs
            </h2>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
          </Card>
        ) : (
          <Card>
            <h2 className="text-base font-semibold text-slate-900">
              Activity log
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              A full record of every action taken on this study, in chronological order.
            </p>

            {logs.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No activity recorded yet.
              </p>
            ) : (
              <ol className="mt-4 divide-y divide-slate-100">
                {logs.map((log) => (
                  <li key={log.log_id} className="py-3">
                    <p className="text-sm text-slate-800">
                      {formatLogEntry(log)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        {Object.entries(log.details)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
