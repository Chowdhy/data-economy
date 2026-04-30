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
              const fieldName = field.name || field.field_name || "Unnamed field";
              const fieldDescription =
                field.description ||
                field.field_desc ||
                "No field description provided.";
              const isEnum = field.field_type === "enum";
              const options = field.options || [];

              return (
                <label
                  key={field.field_id}
                  className={[
                    "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition hover:border-slate-300",
                    isSelected
                      ? "border-amber-300 bg-amber-50"
                      : "border-slate-200",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                    checked={isSelected}
                    onChange={() => onToggleField(field.field_id)}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {fieldName}
                      </p>

                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
                        {isEnum ? "Multiple choice" : "Free text"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-600">
                      {fieldDescription}
                    </p>

                    {isEnum && options.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {options.map((option) => (
                          <span
                            key={option.option_id}
                            className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200"
                          >
                            {option.value}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {isEnum && options.length === 0 ? (
                      <p className="mt-2 text-xs text-rose-600">
                        This multiple choice field has no options configured.
                      </p>
                    ) : null}

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