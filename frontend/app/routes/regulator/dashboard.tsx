import { useNavigate } from "react-router";
import AppShell from "~/components/layout/AppShell";
import Button from "~/components/ui/Button";
import Card from "~/components/ui/Card";
import SectionHeading from "~/components/ui/SectionHeading";

export default function RegulatorDashboard() {
  const navigate = useNavigate();

  return (
    <AppShell
      role="regulator"
      title="Regulator Dashboard"
      subtitle="Review submitted studies, approve suitable research, and raise issues where more changes are needed."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <p className="text-sm text-slate-500">Study reviews</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              Pending studies
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Open the review area to inspect studies submitted by researchers.
            </p>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Researcher approvals</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              Coming next
            </p>
            <p className="mt-2 text-sm text-slate-600">
              You can add researcher role approval here once the backend flow is
              ready.
            </p>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Issues workflow</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              UI ready
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Use the study review pages to prepare field-level issue flags and
              regulator comments.
            </p>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate("/regulator/studies")}>
            Review pending studies
          </Button>

          <Button variant="secondary" disabled>
            Researcher approvals
          </Button>
        </div>

        <section>
          <SectionHeading
            title="What you can do here"
            description="This area is for reviewing study submissions before they are allowed to proceed."
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="text-base font-semibold text-slate-900">
                Approve or reject studies
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Open each study to inspect its description, durations, and the
                personal data fields being requested.
              </p>
            </Card>

            <Card>
              <h2 className="text-base font-semibold text-slate-900">
                Raise issues for revision
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                The review page can also show a regulator comment box and
                field-level issue selection UI, even before the backend is fully
                connected.
              </p>
            </Card>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
