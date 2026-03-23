import Card from "~/components/ui/Card";

interface RequiredFieldsListProps {
  fieldIds: number[];
}

export default function RequiredFieldsList({
  fieldIds,
}: RequiredFieldsListProps) {
  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-900">
        Required fields
      </h3>

      <div className="mt-3 flex flex-wrap gap-2">
        {fieldIds.length > 0 ? (
          fieldIds.map((id) => (
            <span
              key={id}
              className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700"
            >
              Field #{id}
            </span>
          ))
        ) : (
          <p className="text-sm text-slate-500">No required fields.</p>
        )}
      </div>
    </Card>
  );
}
