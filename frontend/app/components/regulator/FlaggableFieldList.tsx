import Card from "~/components/ui/Card";
import type { StudyField } from "~/lib/types";

type FlaggableFieldListProps = {
  title: string;
  description?: string;
  fields: StudyField[];
  selectedFieldIds: number[];
  onToggleField: (fieldId: number) => void;
};

export default function FlaggableFieldList({
  title,
  description,
  fields,
  selectedFieldIds,
  onToggleField,
}: FlaggableFieldListProps) {
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          ) : null}
        </div>

        {fields.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-4">
            <p className="text-sm text-slate-600">No fields to display.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field) => {
              const isSelected = selectedFieldIds.includes(field.field_id);

              return (
                <label
                  key={field.field_id}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                    checked={isSelected}
                    onChange={() => onToggleField(field.field_id)}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {field.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {field.description || "No field description provided."}
                    </p>

                    {isSelected ? (
                      <p className="mt-2 text-xs font-medium text-amber-700">
                        Marked for regulator issue feedback
                      </p>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
