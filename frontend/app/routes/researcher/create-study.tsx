import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import Input from "~/components/ui/Input";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import { getCurrentUser } from "~/lib/auth";
import type { FieldDescription } from "~/lib/types";

export default function CreateStudyPage() {
  const navigate = useNavigate();

  const currentUser = getCurrentUser();
  const researcherId =
    currentUser?.role_id === "researcher" ? currentUser.user_id : null;

  const [studyName, setStudyName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [availableFields, setAvailableFields] = useState<FieldDescription[]>(
    []
  );
  const [selectedFieldIds, setSelectedFieldIds] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingFields, setLoadingFields] = useState(true);

  useEffect(() => {
    async function loadFields() {
      if (!researcherId) {
        setError("No logged-in researcher found");
        setLoadingFields(false);
        return;
      }

      try {
        setLoadingFields(true);
        setError("");
        const data = await api.getFields();
        setAvailableFields(data.fields);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load fields");
      } finally {
        setLoadingFields(false);
      }
    }

    loadFields();
  }, [researcherId]);

  function toggleField(fieldId: number) {
    setSelectedFieldIds((current) =>
      current.includes(fieldId)
        ? current.filter((id) => id !== fieldId)
        : [...current, fieldId]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!researcherId) {
      setError("No logged-in researcher found");
      return;
    }

    const parsedDuration = Number(durationMonths);

    if (!studyName.trim()) {
      setError("Please enter a study name.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a study description.");
      return;
    }

    if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
      setError("Please enter a valid duration in whole months.");
      return;
    }

    if (selectedFieldIds.length === 0) {
      setError("Please select at least one requested field.");
      return;
    }

    try {
      setSubmitting(true);

      await api.createStudy({
        study_name: studyName.trim(),
        description: description.trim(),
        duration_months: parsedDuration,
        creator_id: researcherId,
        field_ids: selectedFieldIds,
      });

      setMessage("Study created successfully.");
      setStudyName("");
      setDescription("");
      setDurationMonths("");
      setSelectedFieldIds([]);

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
      subtitle="Set up a new study with a description, duration, and requested fields."
    >
      <SectionHeading
        title="New study"
        description="Enter the study details and choose the preset fields participants will be asked to provide."
      />

      <Card className="max-w-3xl">
        {!researcherId ? (
          <p className="text-sm text-rose-600">No logged-in researcher found.</p>
        ) : (
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
                htmlFor="study-description"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Description
              </label>
              <textarea
                id="study-description"
                placeholder="Describe what the study is about and what participants should expect."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="study-duration"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Duration (months)
              </label>
              <Input
                id="study-duration"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 6"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Requested fields
              </label>

              {loadingFields ? (
                <p className="text-sm text-slate-500">Loading fields...</p>
              ) : availableFields.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No fields are currently available.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableFields.map((field) => (
                    <label
                      key={field.field_id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFieldIds.includes(field.field_id)}
                        onChange={() => toggleField(field.field_id)}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {field.field_name}
                        </p>
                        {field.field_desc ? (
                          <p className="text-sm text-slate-500">
                            {field.field_desc}
                          </p>
                        ) : null}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={submitting || loadingFields}>
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
        )}
      </Card>
    </AppShell>
  );
}