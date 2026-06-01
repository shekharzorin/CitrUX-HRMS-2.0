import * as React from "react";
import { cn } from "../../utils/cn";

export interface TopbarProps extends React.HTMLAttributes<HTMLDivElement> {
  // Can be extended with left/right actions
}

export function Topbar({ className, children, ...props }: TopbarProps) {
  return (
    <div
      className={cn(
        "flex h-16 items-center justify-between px-6 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function TopbarLeft({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-4", className)} {...props}>
      {children}
    </div>
  );
}

export function TopbarRight({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-4", className)} {...props}>
      {children}
    </div>
  );
}
