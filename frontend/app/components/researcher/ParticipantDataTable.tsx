import { Fragment, useState } from "react";
import Card from "~/components/ui/Card";
import type { AnonymisedGroup, StudyDataResponse } from "~/lib/types";

interface ParticipantDataTableProps {
  data: StudyDataResponse;
}

function formatFieldName(fieldName: string) {
  return fieldName
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getQuasiIdentifierLabel(fieldName: string) {
  if (fieldName === "sex_gender") return "Sex / gender";
  if (fieldName === "age") return "Age range";
  if (fieldName === "postcode") return "Postcode area";

  return formatFieldName(fieldName);
}

function getQuasiIdentifierValue(group: AnonymisedGroup, fieldName: string) {
  if (fieldName === "age") return group.quasi_identifiers.age_range ?? "-";

  if (fieldName === "postcode") {
    return group.quasi_identifiers.postcode_area ?? "-";
  }

  return group.quasi_identifiers[fieldName] ?? "-";
}

function getBreakdownRows(group: AnonymisedGroup) {
  return Object.entries(group.field_value_counts).flatMap(
    ([fieldName, valueCounts]) =>
      Object.entries(valueCounts).map(([value, count]) => ({
        fieldName,
        value,
        count,
      })),
  );
}

export default function ParticipantDataTable({
  data,
}: ParticipantDataTableProps) {
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    new Set(),
  );

  const groups = data.groups ?? [];
  const summary = data.summary;
  const privacy = data.privacy;

  const activeQuasiIdentifierFields =
    privacy?.active_quasi_identifier_fields ?? [];
  const activeSensitiveFields = privacy?.active_sensitive_fields ?? [];
  const activeOtherFields = privacy?.active_other_fields ?? [];

  function toggleGroup(groupId: string) {
    setExpandedGroupIds((current) => {
      const next = new Set(current);

      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }

      return next;
    });
  }

  return (
    <Card>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Anonymised participant data
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          Participants are grouped using generalised identifiers, and groups
          that do not meet the privacy thresholds are suppressed.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total participants
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {summary.total_participants}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Released records
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {summary.released_participants}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Suppressed records
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {summary.suppressed_participants}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Privacy considerations
        </h3>

        <p className="mt-2 text-sm text-slate-600">
          The data has been anonymised using k-anonymity and l-diversity. This
          means at least {privacy.k} participants are in each released group,
          and each group has at least {privacy.l} different values for the
          protected fields.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Grouped by
            </p>

            {activeQuasiIdentifierFields.length ? (
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {activeQuasiIdentifierFields.map((fieldName) => (
                  <li key={fieldName} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span>{getQuasiIdentifierLabel(fieldName)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                No quasi-identifiers requested
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Protected fields
            </p>

            {activeSensitiveFields.length ? (
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {activeSensitiveFields.map((fieldName) => (
                  <li key={fieldName} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span>{formatFieldName(fieldName)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                No sensitive fields requested
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Other fields
            </p>

            {activeOtherFields.length ? (
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {activeOtherFields.map((fieldName) => (
                  <li key={fieldName} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span>{formatFieldName(fieldName)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                No additional fields
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-base font-semibold text-slate-900">
          Released anonymised groups
        </h3>

        <p className="mt-1 text-sm text-slate-600">
          One row is shown per released group. Use the breakdown button to view
          aggregated field counts for that group.
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          {groups.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">
              No anonymised groups can be shown with the current privacy
              thresholds.
            </p>
          ) : (
            <div className="max-h-[1400px] overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Group</th>
                    <th className="px-4 py-3 font-medium">Group size</th>

                    {activeQuasiIdentifierFields.map((fieldName) => (
                      <th key={fieldName} className="px-4 py-3 font-medium">
                        {getQuasiIdentifierLabel(fieldName)}
                      </th>
                    ))}

                    <th className="px-4 py-3 font-medium">Breakdown</th>
                  </tr>
                </thead>

                <tbody>
                  {groups.map((group) => {
                    const isExpanded = expandedGroupIds.has(group.group_id);
                    const breakdownRows = getBreakdownRows(group);

                    return (
                      <Fragment key={group.group_id}>
                        <tr className="border-t border-slate-200">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {group.group_id}
                          </td>

                          <td className="px-4 py-3 text-slate-900">
                            {group.group_size}
                          </td>

                          {activeQuasiIdentifierFields.map((fieldName) => (
                            <td
                              key={`${group.group_id}-${fieldName}`}
                              className="px-4 py-3 text-slate-700"
                            >
                              {getQuasiIdentifierValue(group, fieldName)}
                            </td>
                          ))}

                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => toggleGroup(group.group_id)}
                              className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {isExpanded ? "Hide breakdown" : "View breakdown"}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="border-t border-slate-200 bg-slate-50">
                            <td
                              colSpan={activeQuasiIdentifierFields.length + 3}
                              className="px-4 py-4"
                            >
                              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <h4 className="font-semibold text-slate-900">
                                  {group.group_id} field breakdown
                                </h4>

                                <p className="mt-1 text-sm text-slate-600">
                                  Aggregated counts are shown for the released
                                  fields in this group.
                                </p>

                                {breakdownRows.length === 0 ? (
                                  <p className="mt-3 text-sm text-slate-500">
                                    No released field values are available for
                                    this group.
                                  </p>
                                ) : (
                                  <div className="mt-3 overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                      <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                          <th className="px-4 py-3 font-medium">
                                            Field
                                          </th>
                                          <th className="px-4 py-3 font-medium">
                                            Value
                                          </th>
                                          <th className="px-4 py-3 font-medium">
                                            Count
                                          </th>
                                        </tr>
                                      </thead>

                                      <tbody>
                                        {breakdownRows.map((row) => (
                                          <tr
                                            key={`${group.group_id}-${row.fieldName}-${row.value}`}
                                            className="border-t border-slate-200"
                                          >
                                            <td className="px-4 py-3 text-slate-900">
                                              {formatFieldName(row.fieldName)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">
                                              {row.value}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-900">
                                              {row.count}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
