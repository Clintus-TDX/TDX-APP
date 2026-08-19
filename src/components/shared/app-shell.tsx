"use client";

import { useState } from "react";
import { Header } from "./header";
import { Sidebar, type AppTab } from "./sidebar";
import { COMPANY } from "@/lib/constants";
import { HelpGuide } from "./help-guide";

interface AppShellProps {
  children: (tab: AppTab, setTab: (tab: AppTab) => void) => React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [tab, setTab] = useState<AppTab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onToggleHelp={() => setHelpOpen(true)} onNavigate={setTab} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={tab}
          onTabChange={setTab}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className="flex-1 overflow-auto custom-scroll" role="main">
          <div className="p-4 lg:p-6">
            {children(tab, setTab)}
          </div>

          {/* Sticky Footer */}
          <footer className="border-t border-border mt-auto px-4 lg:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-muted-foreground bg-card no-print">
            <span>
              &copy; {new Date().getFullYear()} {COMPANY.name}. All rights reserved.
            </span>
            <span className="flex items-center gap-2">
              <span>{COMPANY.tagline}</span>
              <span>&middot;</span>
              <span>{COMPANY.developer}</span>
            </span>
          </footer>
        </main>
      </div>

      {helpOpen && <HelpGuide open={helpOpen} onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
