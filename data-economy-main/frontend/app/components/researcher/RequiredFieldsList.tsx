import Card from "~/components/ui/Card";

import type { FieldDescription } from "~/lib/types";

interface RequiredFieldsListProps {
  fields: FieldDescription[];
}

export default function RequiredFieldsList({
  fields,
}: RequiredFieldsListProps) {
  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-900">
        Required fields
      </h3>

      <div className="mt-3 flex flex-wrap gap-2">
        {fields.length > 0 ? (
          fields.map((field) => (
            <span
              key={field.field_id}
              className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700"
            >
              {field.field_name}
            </span>
          ))
        ) : (
          <p className="text-sm text-slate-500">No required fields.</p>
        )}
      </div>
    </Card>
  );
}
