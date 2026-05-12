/**
 * Props expected by the SectionHeading component
 */
interface SectionHeadingProps {
  title: string;
  description?: string;
}

/**
 * Reusable SectionHeading component used for displaying
 * page section titles with an optional description.
 *
 * Helps maintain consistent heading styling across the application.
 */
export default function SectionHeading({
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      ) : null}
    </div>
  );
}
