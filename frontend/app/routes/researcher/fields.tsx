import { useEffect, useState } from "react";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import Input from "~/components/ui/Input";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import { getCurrentUser } from "~/lib/auth";
import type { FieldDescription } from "~/lib/types";

export default function ResearcherFieldsPage() {
  const currentUser = getCurrentUser();
  const isResearcher = currentUser?.role_id === "researcher";

  const [fields, setFields] = useState<FieldDescription[]>([]);
  const [fieldName, setFieldName] = useState("");
  const [fieldDesc, setFieldDesc] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadFields() {
    try {
      setLoading(true);
      setError("");
      const response = await api.getFields();
      setFields(response.fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load fields");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateField(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!fieldName.trim()) {
      setError("Field name is required.");
      return;
    }

    try {
      setSaving(true);
      await api.createField({
        field_name: fieldName.trim(),
        field_desc: fieldDesc.trim() || undefined,
      });
      setMessage("Field created successfully.");
      setFieldName("");
      setFieldDesc("");
      await loadFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create field");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadFields();
  }, []);

  return (
    <AppShell
      role="researcher"
      title="Fields"
      subtitle="Create and review the reusable participant data fields used across studies."
    >
      <SectionHeading
        title="Field catalog"
        description="Fields created here can be reused later when you set up new studies."
      />

      {!isResearcher ? (
        <Card>
          <p className="text-sm text-rose-600">No logged-in researcher found.</p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Create field</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add a new field definition that participants can fill in and studies can request.
            </p>

            <form onSubmit={handleCreateField} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Field name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. blood_pressure"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  value={fieldDesc}
                  onChange={(e) => setFieldDesc(e.target.value)}
                  rows={4}
                  placeholder="Explain what this field captures."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Add field"}
              </Button>

              {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            </form>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Available fields</h2>
            <p className="mt-1 text-sm text-slate-500">
              Existing fields that can be requested in studies.
            </p>

            <div className="mt-5 space-y-3">
              {loading ? (
                <p className="text-sm text-slate-500">Loading fields...</p>
              ) : fields.length === 0 ? (
                <p className="text-sm text-slate-500">No fields available yet.</p>
              ) : (
                fields.map((field) => (
                  <div
                    key={field.field_id}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {field.field_name}
                    </p>
                    {field.field_desc ? (
                      <p className="mt-1 text-sm text-slate-500">
                        {field.field_desc}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
