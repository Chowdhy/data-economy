import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

type BadgeTone = "success" | "warning" | "danger" | "neutral" | "purple" | "info";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

const toneStyles: Record<BadgeTone, string> = {
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-rose-100 text-rose-800",
  neutral: "bg-slate-100 text-slate-700",
  purple: "bg-purple-500/10 text-purple-700",
  info: "bg-blue-500/10 text-blue-700",
};

export default function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-medium",
        toneStyles[tone],
      )}
    >
      {children}
    </span>
  );
}
