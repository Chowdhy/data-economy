import Card from "~/components/ui/Card";
import type { StudyDataResponse } from "~/lib/types";

interface ParticipantDataTableProps {
  data: StudyDataResponse;
}

export default function ParticipantDataTable({
  data,
}: ParticipantDataTableProps) {
  const participantEntries = Object.entries(data.participants);

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">
        Consented participant data
      </h2>

      <div className="mt-4 space-y-6">
        {participantEntries.length === 0 ? (
          <p className="text-sm text-slate-500">
            No participant data available.
          </p>
        ) : (
          participantEntries.map(([participantId, fields]) => (
            <div
              key={participantId}
              className="overflow-hidden rounded-2xl border border-slate-200"
            >
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="font-semibold text-slate-900">
                  Participant #{participantId}
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Field</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Answer</th>
                    </tr>
                  </thead>

                  <tbody>
                    {fields.map((field) => (
                      <tr
                        key={`${participantId}-${field.field_id}`}
                        className="border-t border-slate-200"
                      >
                        <td className="px-4 py-3 text-slate-900">
                          {field.field_name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {field.field_desc || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-900">
                          {field.answer || "No answer provided"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
