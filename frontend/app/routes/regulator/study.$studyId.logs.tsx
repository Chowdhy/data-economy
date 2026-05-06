import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import { api } from "~/lib/api";
import type { ActivityLog } from "~/lib/types";

export default function StudyLogsPage() {
  const navigate = useNavigate();
  const { studyId } = useParams();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studyId) return;
    setIsLoading(true);
    api
      .getStudyLogs(Number(studyId))
      .then((res) => setLogs(res.logs))
      .catch(() => setError("Could not load activity logs."))
      .finally(() => setIsLoading(false));
  }, [studyId]);

  return (
    <AppShell
      role="regulator"
      title="Activity Log"
      subtitle={`Full history of actions taken on study #${studyId}.`}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate(`/regulator/studies/${studyId}`)}>
            Back to study
          </Button>
        </div>

        <Card>
          <h2 className="text-base font-semibold text-slate-900">Study activity log</h2>

          {isLoading ? (
            <p className="mt-4 text-sm text-slate-500">Loading logs...</p>
          ) : error ? (
            <p className="mt-4 text-sm text-rose-600">{error}</p>
          ) : logs.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No activity recorded yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {logs.map((log) => (
                <div
                  key={log.log_id}
                  className="py-3 flex flex-wrap items-baseline gap-x-3 gap-y-1"
                >
                  <span className="text-sm text-slate-800">{log.message}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
