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
  const [dataCollectionMonths, setDataCollectionMonths] = useState("");
  const [researchDurationMonths, setResearchDurationMonths] = useState("");
  const [availableFields, setAvailableFields] = useState<FieldDescription[]>([]);
  const [requiredFieldIds, setRequiredFieldIds] = useState<number[]>([]);
  const [optionalFieldIds, setOptionalFieldIds] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingFields, setLoadingFields] = useState(true);

  useEffect(() => {
    async function loadFields() {
      if (!researcherId) {
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

  function toggleField(fieldId: number, group: "required" | "optional") {
    if (group === "required") {
      setRequiredFieldIds((current) =>
        current.includes(fieldId)
          ? current.filter((id) => id !== fieldId)
          : [...current, fieldId],
      );
      setOptionalFieldIds((current) => current.filter((id) => id !== fieldId));
      return;
    }

    setOptionalFieldIds((current) =>
      current.includes(fieldId)
        ? current.filter((id) => id !== fieldId)
        : [...current, fieldId],
    );
    setRequiredFieldIds((current) => current.filter((id) => id !== fieldId));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!researcherId) {
      return;
    }

    const parsedDataCollectionMonths = Number(dataCollectionMonths);
    const parsedResearchDurationMonths = Number(researchDurationMonths);

    if (!studyName.trim()) {
      setError("Please enter a study name.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a study description.");
      return;
    }

    if (
      !Number.isInteger(parsedDataCollectionMonths) ||
      parsedDataCollectionMonths <= 0
    ) {
      setError("Please enter a valid data collection duration in whole months.");
      return;
    }

    if (
      !Number.isInteger(parsedResearchDurationMonths) ||
      parsedResearchDurationMonths <= 0
    ) {
      setError("Please enter a valid research duration in whole months.");
      return;
    }

    if (requiredFieldIds.length === 0) {
      setError("Please select at least one required field.");
      return;
    }

    try {
      setSubmitting(true);

      await api.createStudy({
        study_name: studyName.trim(),
        description: description.trim(),
        data_collection_months: parsedDataCollectionMonths,
        research_duration_months: parsedResearchDurationMonths,
        required_field_ids: requiredFieldIds,
        optional_field_ids: optionalFieldIds,
      });

      setMessage("Study created successfully.");
      setStudyName("");
      setDescription("");
      setDataCollectionMonths("");
      setResearchDurationMonths("");
      setRequiredFieldIds([]);
      setOptionalFieldIds([]);

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
      subtitle="Set up a study with collection and research durations before it goes for approval."
    >
      <SectionHeading
        title="New study"
        description="Required fields keep participants enrolled. Optional fields can be added for broader, voluntary sharing."
      />

      <Card className="max-w-4xl">
        {!researcherId ? (
          <p className="text-sm text-slate-600">Redirecting to login...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
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
                htmlFor="study-data-duration"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Data collection duration (months)
              </label>
              <Input
                id="study-data-duration"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 6"
                value={dataCollectionMonths}
                onChange={(e) => setDataCollectionMonths(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="study-research-duration"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Research duration (months)
              </label>
              <Input
                id="study-research-duration"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 12"
                value={researchDurationMonths}
                onChange={(e) => setResearchDurationMonths(e.target.value)}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Required fields
                </label>
                <p className="mb-3 text-sm text-slate-500">
                  Participants must keep these fields consented to stay in the study.
                </p>

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
                        key={`required-${field.field_id}`}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3"
                      >
                        <input
                          type="checkbox"
                          checked={requiredFieldIds.includes(field.field_id)}
                          onChange={() => toggleField(field.field_id, "required")}
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

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Optional fields
                </label>
                <p className="mb-3 text-sm text-slate-500">
                  These can be shared voluntarily by participants after joining.
                </p>

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
                        key={`optional-${field.field_id}`}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3"
                      >
                        <input
                          type="checkbox"
                          checked={optionalFieldIds.includes(field.field_id)}
                          onChange={() => toggleField(field.field_id, "optional")}
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
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Required fields selected: {requiredFieldIds.length}
              <br />
              Optional fields selected: {optionalFieldIds.length}
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
