import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

/**
 * Props expected by the Card component
 */
interface CardProps {
  children: ReactNode;
  className?: string;
}

/**
 * Reusable Card component used as a styled container
 * across the application.
 *
 * Provides consistent spacing, border, background,
 * rounded corners, and shadow styling.
 */
export default function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
