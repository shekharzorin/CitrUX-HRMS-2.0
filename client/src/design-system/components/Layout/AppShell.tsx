import * as React from "react";
import { cn } from "../../utils/cn";

export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar?: React.ReactNode;
  topbar?: React.ReactNode;
}

export function AppShell({ sidebar, topbar, children, className, ...props }: AppShellProps) {
  return (
    <div className={cn("flex min-h-screen bg-bg-body", className)} {...props}>
      {/* Sidebar */}
      {sidebar && <aside className="flex-shrink-0 z-40 hidden lg:block">{sidebar}</aside>}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {topbar && <header className="sticky top-0 z-30">{topbar}</header>}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mx-auto max-w-7xl w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
