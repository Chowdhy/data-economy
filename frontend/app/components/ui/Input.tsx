import type { InputHTMLAttributes } from "react";
import { cn } from "~/lib/utils";

/**
 * Reusable Input component used across the application.
 *
 * Extends all standard HTML input attributes such as
 * type, placeholder, value, onChange, disabled, etc.
 *
 * Provides consistent styling for forms including
 * borders, spacing, focus states, and text appearance.
 */
export default function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500",
        className,
      )}
      {...props}
    />
  );
}
