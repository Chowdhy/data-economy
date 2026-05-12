// Import reusable Card UI component used as a styled container
import Card from "~/components/ui/Card";
import type { FieldDescription } from "~/lib/types";

/**
 * Props expected by the ConsentFieldList component
 */
interface ConsentFieldListProps {
  fields: FieldDescription[];
}

/**
 * Displays a list of consented fields inside a Card component.
 * Each field is shown as a pill-style tag.
 * If no fields exist, a fallback message is displayed.
 */
export default function ConsentFieldList({ fields }: ConsentFieldListProps) {
  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-900">
        Consented fields
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
          <p className="text-sm text-slate-500">No consented fields.</p>
        )}
      </div>
    </Card>
  );
}
