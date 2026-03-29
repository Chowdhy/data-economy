import { useState } from "react";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import Input from "~/components/ui/Input";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import { getCurrentUser } from "~/lib/auth";

interface AnswerRow {
  field_id: string;
  answer: string;
}

export default function ParticipantProfilePage() {
  const currentUser = getCurrentUser();
  const participantId =
    currentUser?.role_id === "participant" ? currentUser.user_id : null;

  const [answers, setAnswers] = useState<AnswerRow[]>([
    { field_id: "", answer: "" },
  ]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateRow(index: number, key: keyof AnswerRow, value: string) {
    setAnswers((current) =>
      current.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  }

  function addRow() {
    setAnswers((current) => [...current, { field_id: "", answer: "" }]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!participantId) {
      setError("No logged-in participant found");
      return;
    }

    const cleanedAnswers = answers
      .filter((row) => row.field_id.trim() !== "")
      .map((row) => ({
        field_id: Number(row.field_id),
        answer: row.answer,
      }));

    if (cleanedAnswers.length === 0) {
      setError("Please enter at least one field ID.");
      return;
    }

    try {
      await api.saveAnswers(participantId, cleanedAnswers);
      setMessage("Answers saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save answers");
    }
  }

  return (
    <AppShell
      role="participant"
      title="My Answers"
      subtitle="Add or update your answers for profile fields used in studies."
    >
      <SectionHeading
        title="Manage participant answers"
        description="This form lets you submit answers for field IDs stored by your backend."
      />

      <Card className="max-w-3xl">
        {!participantId ? (
          <p className="text-sm text-rose-600">No logged-in participant found.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {answers.map((row, index) => (
              <div key={index} className="grid gap-4 md:grid-cols-3">
                <div>
                  <label
                    htmlFor={`field-id-${index}`}
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Field ID
                  </label>
                  <Input
                    id={`field-id-${index}`}
                    type="number"
                    placeholder="e.g. 1"
                    value={row.field_id}
                    onChange={(e) =>
                      updateRow(index, "field_id", e.target.value)
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor={`answer-${index}`}
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Answer
                  </label>
                  <Input
                    id={`answer-${index}`}
                    type="text"
                    placeholder="Enter your answer"
                    value={row.answer}
                    onChange={(e) => updateRow(index, "answer", e.target.value)}
                  />
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={addRow}>
                Add another field
              </Button>
              <Button type="submit">Save answers</Button>
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