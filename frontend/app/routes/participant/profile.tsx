import { useEffect, useState } from "react";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import Input from "~/components/ui/Input";
import SectionHeading from "~/components/ui/SectionHeading";
import { api } from "~/lib/api";
import { getCurrentUser } from "~/lib/auth";

interface AnswerRow {
  field_name: string;
  field_description?: string | null;
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

  useEffect(() => {
    async function loadAnswers() {
      if (!participantId) {
        setLoading(false);
        return;
      }

      setMessage("");
      setError("");

      try {
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!participantId) {
      setError("No logged-in participant found");
      return;
    }

    const cleanedAnswers = answers.map((row) => ({
      field_name: row.field_name,
      answer: row.answer,
    }));

    if (cleanedAnswers.length === 0) {
      setError("No profile fields are available.");
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
      subtitle="View and update your answers for profile fields used in studies."
    >
      <SectionHeading
        title="Manage participant answers"
        description="Review your existing answers below and update them whenever needed."
      />

      <Card className="max-w-3xl">
        {!participantId ? (
          <p className="text-sm text-rose-600">
            No logged-in participant found.
          </p>
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
                <div key={row.field_name} className="space-y-2">
                  <div>
                    <label
                      htmlFor={`answer-${index}`}
                      className="block text-sm font-medium text-slate-700"
                    >
                      {row.field_name}
                    </label>
                    {row.field_description ? (
                      <p className="mt-1 text-sm text-slate-500">
                        {row.field_description}
                      </p>
                    ) : null}
                  </div>

                  <Input
                    id={`answer-${index}`}
                    type="text"
                    placeholder={`Enter your answer for ${row.field_name}`}
                    value={row.answer}
                    onChange={(e) => updateAnswer(index, e.target.value)}
                  />
                </div>
              ))
            )}

            {answers.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                <Button type="submit">Save answers</Button>
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
