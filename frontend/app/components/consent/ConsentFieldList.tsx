import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";

interface ConsentFieldListProps {
  fieldIds: number[];
  onWithdraw?: () => void;
  onRegrant?: () => void;
}

export default function ConsentFieldList({
  fieldIds,
  onWithdraw,
  onRegrant,
}: ConsentFieldListProps) {
  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-900">
        Consented fields
      </h3>

      <div className="mt-3 flex flex-wrap gap-2">
        {fieldIds.length > 0 ? (
          fieldIds.map((id) => (
            <span
              key={id}
              className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
            >
              Field #{id}
            </span>
          ))
        ) : (
          <p className="text-sm text-slate-500">
            No fields are currently consented.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onRegrant}>
          Regrant consent
        </Button>
        <Button variant="danger" onClick={onWithdraw}>
          Withdraw consent
        </Button>
      </div>
    </Card>
  );
}
