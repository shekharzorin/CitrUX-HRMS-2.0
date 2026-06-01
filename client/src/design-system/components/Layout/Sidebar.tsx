import * as React from "react";
import { cn } from "../../utils/cn";

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false, className, children, ...props }: SidebarProps) {
  return (
    <div
      className={cn(
        "flex flex-col h-screen border-r border-slate-200 bg-bg-sidebar transition-all duration-300 dark:border-slate-800",
        collapsed ? "w-16" : "w-64",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex h-16 shrink-0 items-center border-b border-slate-100 px-5 dark:border-slate-800",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto py-4 custom-scrollbar", className)}
      {...props}
    >
      <nav className="flex flex-col space-y-0.5">{children}</nav>
    </div>
  );
}

export function SidebarGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      {title && (
        <h4 className="mb-2 px-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}

export function SidebarFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-auto border-t border-slate-100 p-4 dark:border-slate-800",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
