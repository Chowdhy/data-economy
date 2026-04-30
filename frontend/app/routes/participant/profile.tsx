import { useEffect, useState } from "react";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import Input from "~/components/ui/Input";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import { getCurrentUser } from "~/lib/auth";
import type { FieldType } from "~/lib/types";

interface AnswerRow {
  field_id: number;
  field_name: string;
  field_description?: string | null;
  field_type: FieldType;
  options: string[];
  answer: string;
}

export default function ParticipantProfilePage() {
  const currentUser = getCurrentUser();
  const participantId =
    currentUser?.role_id === "participant" ? currentUser.user_id : null;

  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadAnswers() {
      if (!participantId) {
        setLoading(false);
        return;
      }

      setMessage("");
      setError("");

      try {
        setLoading(true);
        const response = await api.getParticipantAnswers(participantId);
        setAnswers(response.answers || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load answers");
      } finally {
        setLoading(false);
      }
    }

    loadAnswers();
  }, [participantId]);

  function updateAnswer(index: number, value: string) {
    setAnswers((current) =>
      current.map((row, i) => (i === index ? { ...row, answer: value } : row)),
    );
  }

  function clearAnswer(index: number) {
    updateAnswer(index, "");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!participantId) {
      return;
    }

    const cleanedAnswers = answers.map((row) => ({
      field_id: row.field_id,
      field_name: row.field_name,
      answer: row.answer,
    }));

    if (cleanedAnswers.length === 0) {
      setError("No profile fields are available.");
      return;
    }

    try {
      setSaving(true);
      await api.saveAnswers(participantId, cleanedAnswers);
      setMessage("Answers saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save answers");
    } finally {
      setSaving(false);
    }
  }

  function renderAnswerInput(row: AnswerRow, index: number) {
    if (row.field_type === "enum") {
      return (
        <div className="space-y-2">
          {row.options.length === 0 ? (
            <p className="text-sm text-rose-600">
              This multiple choice field has no options configured.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {row.options.map((option) => {
                const selected = row.answer === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateAnswer(index, option)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-sm transition",
                      selected
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}

          {row.answer ? (
            <button
              type="button"
              onClick={() => clearAnswer(index)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Clear selection
            </button>
          ) : null}
        </div>
      );
    }

    return (
      <Input
        id={`answer-${row.field_id}`}
        type="text"
        placeholder={`Enter your answer for ${row.field_name}`}
        value={row.answer}
        onChange={(e) => updateAnswer(index, e.target.value)}
      />
    );
  }

  return (
    <AppShell
      role="participant"
      title="My Answers"
      subtitle="View and update your answers for profile fields used in studies."
    >
      <SectionHeading
        title="Manage participant answers"
        description="Review your existing answers below and update them whenever needed."
      />

      <Card className="max-w-3xl">
        {!participantId ? (
          <p className="text-sm text-slate-600">Redirecting to login...</p>
        ) : loading ? (
          <p className="text-sm text-slate-600">Loading your answers...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {answers.length === 0 ? (
              <p className="text-sm text-slate-600">
                No profile fields are available yet.
              </p>
            ) : (
              answers.map((row, index) => (
                <div
                  key={row.field_id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        htmlFor={`answer-${row.field_id}`}
                        className="block text-sm font-medium text-slate-700"
                      >
                        {row.field_name}
                      </label>

                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {row.field_type === "enum"
                          ? "Multiple choice"
                          : "Free text"}
                      </span>
                    </div>

                    {row.field_description ? (
                      <p className="mt-1 text-sm text-slate-500">
                        {row.field_description}
                      </p>
                    ) : null}
                  </div>

                  {renderAnswerInput(row, index)}
                </div>
              ))
            )}

            {answers.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save answers"}
                </Button>
              </div>
            ) : null}

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