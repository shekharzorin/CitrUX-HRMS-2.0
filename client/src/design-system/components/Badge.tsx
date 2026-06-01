import * as React from "react";
import { cn } from "../utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "outline";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          {
            "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300": variant === "default",
            "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400": variant === "success",
            "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400": variant === "warning",
            "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400": variant === "error",
            "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400": variant === "info",
            "border border-slate-200 text-slate-800 dark:border-slate-700 dark:text-slate-300": variant === "outline",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
