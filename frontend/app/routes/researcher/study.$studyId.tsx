import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import AppShell from "~/components/layout/AppShell";
import ParticipantDataTable from "~/components/researcher/ParticipantDataTable";
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
import type {
  StudyDataResponse,
  StudyDetail,
  StudyIssue,
  StudyResearcher,
  StudyResearcherAccessLevel,
} from "~/lib/types";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function ResearcherStudyDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const studyId = Number(params.studyId);
  const currentUser = getCurrentUser();

  const [study, setStudy] = useState<StudyDetail | null>(null);
  const [issues, setIssues] = useState<StudyIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<StudyDataResponse | null>(null);
  const [dataMessage, setDataMessage] = useState("");

  const [team, setTeam] = useState<StudyResearcher[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addAccessLevel, setAddAccessLevel] =
    useState<StudyResearcherAccessLevel>("viewer");
  const [addMessage, setAddMessage] = useState("");

  async function loadStudy() {
    if (!studyId || Number.isNaN(studyId)) {
      setError("Invalid study ID.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setDataMessage("");

      const issuesResponse = await api.getStudyIssues(studyId).catch(() => ({
        issues: [],
      }));
      setIssues(issuesResponse.issues);

      try {
        const studyResponse = await api.getStudy(studyId);
        console.log("GET STUDY RESPONSE:", studyResponse);
        setStudy(studyResponse.study);
      } catch (err) {
        console.error("Failed to load study", err);
        setStudy(null);
        setError("Study details are not currently available.");
      }

      try {
        const dataResponse = await api.getStudyData(studyId);
        setData(dataResponse);
      } catch (err) {
        console.error("Failed to load study data", err);
        setData(null);
        setDataMessage("Anonymised study data is not currently available.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadTeam() {
    if (!studyId || Number.isNaN(studyId)) return;

    try {
      setTeamLoading(true);
      setTeamError("");
      const res = await api.getStudyResearchers(studyId);
      setTeam(res.researchers);
    } catch (err) {
      setTeamError(
        err instanceof Error ? err.message : "Could not load research team.",
      );
    } finally {
      setTeamLoading(false);
    }
  }

  useEffect(() => {
    loadStudy();
    loadTeam();
  }, [studyId]);

  async function handleAddResearcher() {
    if (!addEmail.trim()) return;

    try {
      setAddMessage("");
      await api.addStudyResearcher(studyId, {
        researcher_email: addEmail.trim(),
        access_level: addAccessLevel,
      });
      setAddEmail("");
      setAddMessage("Researcher added successfully.");
      loadTeam();
    } catch (err) {
      setAddMessage(
        err instanceof Error ? err.message : "Could not add researcher.",
      );
    }
  }

  async function handleUpdateAccess(
    researcherId: number,
    level: StudyResearcherAccessLevel,
  ) {
    try {
      await api.updateStudyResearcher(studyId, researcherId, level);
      loadTeam();
    } catch (err) {
      setAddMessage(
        err instanceof Error ? err.message : "Could not update access level.",
      );
    }
  }

  async function handleRemoveResearcher(researcherId: number) {
    try {
      await api.removeStudyResearcher(studyId, researcherId);
      loadTeam();
    } catch (err) {
      setAddMessage(
        err instanceof Error ? err.message : "Could not remove researcher.",
      );
    }
  }

  const issueCount = issues.length;
  const displayStatus = getResearcherDisplayStatus(
    study?.status ?? "pending",
    issueCount,
  );
  const statusMeta = getResearcherDisplayStatusMeta(displayStatus);
  const openIssues = issues.filter((issue) => issue.status === "open");
  const latestIssue = issues.length > 0 ? issues[0] : null;
  const hasOpenIssue = issues.some((issue) => issue.status === "open");
  const hasRespondedIssue = issues.some(
    (issue) => issue.status === "responded",
  );

  const shouldShowReviewStatus =
    study?.status !== "open" && study?.status !== "ongoing";

  console.log("STUDY STATUS:", study?.status);
  return (
    <AppShell
      role="researcher"
      title={study ? study.study_name : "Study Details"}
      subtitle="Review the research team, study details, and anonymised study data where available."
    >
      <SectionHeading
        title="Study details"
        description="Researcher data access is privacy-preserving. Data is grouped and anonymised before release."
      />

      {loading ? (
        <p className="text-sm text-slate-500">Loading study data...</p>
      ) : (
        <div className="space-y-4">
          <ResearchTeamCard
            team={team}
            loading={teamLoading}
            error={teamError}
            currentUserId={currentUser?.user_id ?? null}
            addEmail={addEmail}
            addAccessLevel={addAccessLevel}
            addMessage={addMessage}
            onAddEmailChange={setAddEmail}
            onAddAccessLevelChange={setAddAccessLevel}
            onAdd={handleAddResearcher}
            onUpdateAccess={handleUpdateAccess}
            onRemove={handleRemoveResearcher}
          />

          {study ? (
            <Card>
              <h2 className="text-base font-semibold text-slate-900">
                Study overview
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-slate-500">Study ID</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {study.study_id}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <div className="mt-1">
                    <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Participants</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {study.participant_count}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Collection Duration</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {study.data_collection_months
                      ? `${study.data_collection_months} months`
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-500">Research Duration</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {study.research_duration_months
                      ? `${study.research_duration_months} months`
                      : "-"}
                  </p>
                </div>
              </div>

              {study.description ? (
                <div className="mt-4">
                  <p className="text-sm text-slate-500">Description</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {study.description}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="success">
                  {study.required_field_ids.length} required fields
                </Badge>

                {study.optional_field_ids.length > 0 ? (
                  <Badge tone="neutral">
                    {study.optional_field_ids.length} optional fields
                  </Badge>
                ) : null}
              </div>
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-slate-600">
                {error || "Study details are not currently available."}
              </p>
            </Card>
          )}

          {shouldShowReviewStatus ? (
            <Card>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Review status
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {statusMeta.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {issueCount > 0 ? (
                    <Badge tone="danger">
                      {issueCount} issue{issueCount === 1 ? "" : "s"}
                    </Badge>
                  ) : null}
                </div>
              </div>

              {latestIssue ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">
                    Latest regulator feedback
                  </p>

                  {latestIssue.comment ? (
                    <p className="mt-2 text-sm text-slate-700">
                      {latestIssue.comment}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      This issue does not include a general comment.
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="neutral">
                      Raised {formatDate(latestIssue.created_at)}
                    </Badge>

                    {latestIssue.flagged_field_ids.length > 0 ? (
                      <Badge tone="warning">
                        {latestIssue.flagged_field_ids.length} flagged field
                        {latestIssue.flagged_field_ids.length === 1 ? "" : "s"}
                      </Badge>
                    ) : null}
                  </div>

                  {latestIssue.flagged_fields &&
                  latestIssue.flagged_fields.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-slate-900">
                        Flagged fields
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {latestIssue.flagged_fields.map((field) => (
                          <Badge key={field.field_id} tone="warning">
                            {field.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">
                    No regulator issues have been raised for this study.
                  </p>
                </div>
              )}

              {openIssues.length > 1 ? (
                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-900">
                    Open issues
                  </p>
                  <div className="mt-3 space-y-3">
                    {openIssues.map((issue) => (
                      <div
                        key={issue.issue_id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-wrap gap-2">
                          <Badge tone="danger">Open issue</Badge>
                          <Badge tone="neutral">
                            Raised {formatDate(issue.created_at)}
                          </Badge>
                        </div>

                        {issue.comment ? (
                          <p className="mt-3 text-sm text-slate-700">
                            {issue.comment}
                          </p>
                        ) : (
                          <p className="mt-3 text-sm text-slate-500">
                            No general comment was provided.
                          </p>
                        )}

                        {issue.flagged_fields &&
                        issue.flagged_fields.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {issue.flagged_fields.map((field) => (
                              <Badge key={field.field_id} tone="warning">
                                {field.name}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {displayStatus === "issues_raised" && hasOpenIssue ? (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Action required
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      Respond to the latest regulator feedback by updating this
                      study.
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    onClick={() =>
                      navigate(`/researcher/studies/${studyId}/modify`)
                    }
                  >
                    Modify study
                  </Button>
                </div>
              ) : displayStatus === "issues_raised" && hasRespondedIssue ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Awaiting regulator review
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    You have submitted changes. The study cannot be modified
                    again until the regulator raises a new issue or approves the
                    study.
                  </p>
                </div>
              ) : null}
            </Card>
          ) : null}

          {data ? (
            <ParticipantDataTable data={data} />
          ) : (
            <Card>
              <p className="text-sm text-slate-600">
                {dataMessage ||
                  "Anonymised study data is not currently available."}
              </p>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}

interface ResearchTeamCardProps {
  team: StudyResearcher[];
  loading: boolean;
  error: string;
  currentUserId: number | null;
  addEmail: string;
  addAccessLevel: StudyResearcherAccessLevel;
  addMessage: string;
  onAddEmailChange: (v: string) => void;
  onAddAccessLevelChange: (v: StudyResearcherAccessLevel) => void;
  onAdd: () => void;
  onUpdateAccess: (id: number, level: StudyResearcherAccessLevel) => void;
  onRemove: (id: number) => void;
}

function ResearchTeamCard({
  team,
  loading,
  error,
  currentUserId,
  addEmail,
  addAccessLevel,
  addMessage,
  onAddEmailChange,
  onAddAccessLevelChange,
  onAdd,
  onUpdateAccess,
  onRemove,
}: ResearchTeamCardProps) {
  const isOwner = team.some(
    (m) => m.is_creator && m.researcher_id === currentUserId,
  );

  const accessBadgeTone = (level: string) =>
    level === "owner" ? "success" : level === "editor" ? "warning" : "neutral";

  return (
    <Card>
      <h2 className="text-base font-semibold text-slate-900">Research team</h2>
      <p className="mt-1 text-sm text-slate-600">
        Collaborators who have access to this study.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading team...</p>
      ) : error ? (
        <p className="mt-4 text-sm text-rose-600">{error}</p>
      ) : (
        <div className="mt-4 space-y-2">
          {team.map((member) => (
            <div
              key={member.researcher_id}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {member.name ?? "—"}
                </p>
                <p className="text-xs text-slate-500">{member.email ?? "—"}</p>
              </div>

              <div className="flex items-center gap-2">
                <Badge tone={accessBadgeTone(member.access_level)}>
                  {member.access_level}
                </Badge>

                {isOwner && !member.is_creator ? (
                  <>
                    <select
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      value={member.access_level}
                      onChange={(e) =>
                        onUpdateAccess(
                          member.researcher_id,
                          e.target.value as StudyResearcherAccessLevel,
                        )
                      }
                    >
                      <option value="editor">editor</option>
                      <option value="viewer">viewer</option>
                    </select>

                    <Button
                      variant="ghost"
                      onClick={() => onRemove(member.researcher_id)}
                    >
                      Remove
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ))}

          {team.length === 0 ? (
            <p className="text-sm text-slate-500">No collaborators yet.</p>
          ) : null}
        </div>
      )}

      {isOwner ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-900">
            Add a collaborator
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
            <input
              type="email"
              placeholder="researcher@example.com"
              value={addEmail}
              onChange={(e) => onAddEmailChange(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={addAccessLevel}
              onChange={(e) =>
                onAddAccessLevelChange(
                  e.target.value as StudyResearcherAccessLevel,
                )
              }
            >
              <option value="editor">editor</option>
              <option value="viewer">viewer</option>
            </select>

            <Button variant="primary" onClick={onAdd}>
              Add
            </Button>
          </div>

          {addMessage ? (
            <p className="mt-2 text-sm text-slate-600">{addMessage}</p>
          ) : null}

          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <span className="font-medium">editor</span> — can view participant
            data and issues. <span className="font-medium">viewer</span> — can
            view study details only.
          </div>
        </div>
      ) : null}
    </Card>
  );
}
