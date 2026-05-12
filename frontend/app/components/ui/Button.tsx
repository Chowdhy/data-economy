import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "~/lib/utils";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "purple";

/**
 * Props expected by the Button component
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

/**
 * Maps each button variant to its corresponding
 * Tailwind CSS styling classes
 */
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
  secondary:
    "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus:ring-slate-400",
  danger:
    "border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 focus:ring-rose-400",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-400",
  purple: "bg-purple-100 text-purple-800 hover:bg-purple-200",
};


/**
 * Reusable Button component used across the application.
 * Supports multiple visual variants and extends all
 * standard HTML button attributes.
 */
export default function Button({
  children,
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
