import type { ReactNode } from "react";

type BadgeTone =
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "info"
  | "purple"
  | "muted";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  success: "border-green-100 bg-green-50 text-green-700",
  warning: "border-amber-100 bg-amber-50 text-amber-700",
  danger: "border-red-100 bg-red-50 text-red-700",
  neutral: "border-slate-100 bg-slate-50 text-slate-700",
  info: "border-blue-100 bg-blue-50 text-blue-700",
  purple: "border-purple-100 bg-purple-50 text-purple-700",
  muted: "border-slate-200 bg-slate-100 text-slate-500",
};

export default function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
