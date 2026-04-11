import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";

type ReviewActionsCardProps = {
  selectedFieldCount: number;
  totalFieldCount: number;
  comment: string;
  onCommentChange: (value: string) => void;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onRaiseIssues: () => void;
};

export default function ReviewActionsCard({
  selectedFieldCount,
  totalFieldCount,
  comment,
  onCommentChange,
  rejectReason,
  onRejectReasonChange,
  onApprove,
  onReject,
  onRaiseIssues,
}: ReviewActionsCardProps) {
  return (
    <Card>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Review actions
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Approve the study, reject it, or prepare issue feedback for the
            researcher.
          </p>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Flagged fields
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {selectedFieldCount} / {totalFieldCount}
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="regulator-comment"
            className="block text-sm font-medium text-slate-900"
          >
            Regulator comment
          </label>
          <p className="mt-1 text-sm text-slate-600">
            Add comments explaining what needs to be changed or clarified.
          </p>
          <textarea
            id="regulator-comment"
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            rows={5}
            className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            placeholder="Enter regulator feedback here..."
          />
        </div>

        <div>
          <label
            htmlFor="reject-reason"
            className="block text-sm font-medium text-slate-900"
          >
            Rejection reason
          </label>
          <p className="mt-1 text-sm text-slate-600">
            This can be used when fully rejecting the study.
          </p>
          <textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(event) => onRejectReasonChange(event.target.value)}
            rows={4}
            className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            placeholder="Enter a rejection reason..."
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={onApprove}>Approve study</Button>

          <Button variant="secondary" onClick={onReject}>
            Reject study
          </Button>

          <Button variant="secondary" onClick={onRaiseIssues}>
            Raise issues
          </Button>
        </div>
      </div>
    </Card>
  );
}
