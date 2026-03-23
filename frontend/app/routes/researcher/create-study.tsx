import { useState } from "react";
import { useNavigate } from "react-router";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import Input from "~/components/ui/Input";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import type { StudyStatus } from "~/lib/types";

export default function CreateStudyPage() {
  const navigate = useNavigate();

  const researcherId = Number(localStorage.getItem("demo_user_id") || "1");

  const [studyName, setStudyName] = useState("");
  const [status, setStatus] = useState<StudyStatus>("pending");
  const [fieldIds, setFieldIds] = useState("1,2,3");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");

    const parsedFieldIds = fieldIds
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map(Number)
      .filter((value) => !Number.isNaN(value));

    if (!studyName.trim()) {
      setError("Please enter a study name.");
      return;
    }

    try {
      setSubmitting(true);

      await api.createStudy({
        study_name: studyName,
        creator_id: researcherId,
        status,
        field_ids: parsedFieldIds,
      });

      setMessage("Study created successfully.");
      setStudyName("");
      setFieldIds("");

      setTimeout(() => {
        navigate("/researcher/studies");
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create study");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      role="researcher"
      title="Create Study"
      subtitle="Set up a new study and define the field IDs it requires."
    >
      <SectionHeading
        title="New study"
        description="Use comma-separated field IDs to match the fields already stored in your backend."
      />

      <Card className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="study-name"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Study name
            </label>
            <Input
              id="study-name"
              type="text"
              placeholder="e.g. Heart Health Study"
              value={studyName}
              onChange={(e) => setStudyName(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="study-status"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Status
            </label>
            <select
              id="study-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as StudyStatus)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
              <option value="closed">closed</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="field-ids"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Required field IDs
            </label>
            <Input
              id="field-ids"
              type="text"
              placeholder="e.g. 1,2,3"
              value={fieldIds}
              onChange={(e) => setFieldIds(e.target.value)}
            />
            <p className="mt-1 text-sm text-slate-500">
              Enter numeric field IDs separated by commas.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create study"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/researcher/studies")}
            >
              Cancel
            </Button>
          </div>

          {message ? (
            <p className="text-sm text-emerald-700">{message}</p>
          ) : null}

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </form>
      </Card>
    </AppShell>
  );
}
