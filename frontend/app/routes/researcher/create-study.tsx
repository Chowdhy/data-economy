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

  const [availableFields, setAvailableFields] = useState<FieldDescription[]>(
    [],
  );
  const [requiredFieldIds, setRequiredFieldIds] = useState<number[]>([]);
  const [optionalFieldIds, setOptionalFieldIds] = useState<number[]>([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingFields, setLoadingFields] = useState(true);

  // Inline field creation state
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldDesc, setNewFieldDesc] = useState("");
  const [newFieldGroup, setNewFieldGroup] = useState<"required" | "optional">(
    "required",
  );
  const [creatingField, setCreatingField] = useState(false);
  const [fieldMessage, setFieldMessage] = useState("");
  const [fieldError, setFieldError] = useState("");

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

  useEffect(() => {
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

  async function handleCreateField(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldMessage("");
    setFieldError("");

    if (!newFieldName.trim()) {
      setFieldError("Field name is required.");
      return;
    }

    try {
      setCreatingField(true);

      const createdField = await api.createField({
        field_name: newFieldName.trim(),
        field_desc: newFieldDesc.trim() || undefined,
      });

      await loadFields();

      const createdFieldId =
        createdField?.field?.field_id ??
        createdField?.field_id ??
        createdField?.id;

      if (typeof createdFieldId === "number") {
        if (newFieldGroup === "required") {
          setRequiredFieldIds((current) =>
            current.includes(createdFieldId)
              ? current
              : [...current, createdFieldId],
          );
          setOptionalFieldIds((current) =>
            current.filter((id) => id !== createdFieldId),
          );
        } else {
          setOptionalFieldIds((current) =>
            current.includes(createdFieldId)
              ? current
              : [...current, createdFieldId],
          );
          setRequiredFieldIds((current) =>
            current.filter((id) => id !== createdFieldId),
          );
        }
      }

      setFieldMessage("Field created successfully.");
      setNewFieldName("");
      setNewFieldDesc("");
      setNewFieldGroup("required");
    } catch (err) {
      setFieldError(
        err instanceof Error ? err.message : "Failed to create field",
      );
    } finally {
      setCreatingField(false);
    }
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
      setError(
        "Please enter a valid data collection duration in whole months.",
      );
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
      subtitle="Set up a study and create any missing participant fields without leaving this page."
    >
      <SectionHeading
        title="New study"
        description="Required fields keep participants enrolled. Optional fields can be added for broader, voluntary sharing."
      />

      <div className="grid gap-6 xl:grid-cols-[1.3fr,0.9fr]">
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
                    Participants must keep these fields consented to stay in the
                    study.
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
                            onChange={() =>
                              toggleField(field.field_id, "required")
                            }
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
                    These can be shared voluntarily by participants after
                    joining.
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
                            onChange={() =>
                              toggleField(field.field_id, "optional")
                            }
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

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Create field</h2>
          <p className="mt-1 text-sm text-slate-500">
            Missing a field? Add it here and include it in this study
            immediately.
          </p>

          <form onSubmit={handleCreateField} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Field name
              </label>
              <Input
                type="text"
                placeholder="e.g. blood_pressure"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                value={newFieldDesc}
                onChange={(e) => setNewFieldDesc(e.target.value)}
                rows={4}
                placeholder="Explain what this field captures."
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Add new field to
              </label>
              <select
                value={newFieldGroup}
                onChange={(e) =>
                  setNewFieldGroup(e.target.value as "required" | "optional")
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="required">Required fields</option>
                <option value="optional">Optional fields</option>
              </select>
            </div>

            <Button type="submit" disabled={creatingField || loadingFields}>
              {creatingField ? "Adding..." : "Add field"}
            </Button>

            {fieldMessage ? (
              <p className="text-sm text-emerald-700">{fieldMessage}</p>
            ) : null}

            {fieldError ? (
              <p className="text-sm text-rose-600">{fieldError}</p>
            ) : null}
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
