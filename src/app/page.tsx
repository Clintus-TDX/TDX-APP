"use client";

import { useAuth } from "@/context/auth-context";
import { useQuery } from "@tanstack/react-query";
import { LoginScreen } from "@/components/shared/login-screen";
import { AppShell } from "@/components/shared/app-shell";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DispatchView } from "@/components/dispatch/dispatch-view";
import { ReportsView } from "@/components/reports/reports-view";
import { InvoicesView } from "@/components/invoices/invoices-view";
import { AdminView } from "@/components/admin/admin-view";
import { AccountsView } from "@/components/accounts/accounts-view";
import type { AppTab } from "@/components/shared/sidebar";
import { Loader2 } from "lucide-react";

// Auto-seed on first load if no users exist
function SeedOnFirstRun() {
  const { user } = useAuth();
  useQuery({
    queryKey: ["auto-seed"],
    queryFn: () => fetch("/api/admin/seed", { method: "POST" }).then(r => r.json()),
    enabled: !!user && user.role === "Super Admin",
    staleTime: Infinity,
    retry: false,
  });
  return null;
}

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <>
      <SeedOnFirstRun />
      <AppShell>
        {(tab: AppTab, setTab: (t: AppTab) => void) => {
          switch (tab) {
            case "dashboard":
              return <DashboardView />;
            case "dispatch":
              return <DispatchView />;
            case "reports":
              return <ReportsView />;
            case "invoices":
              return <InvoicesView />;
            case "admin":
              return <AdminView onNavigate={(t) => setTab(t as AppTab)} />;
            case "accounts":
              return <AccountsView />;
            default:
              return <DashboardView />;
          }
        }}
      </AppShell>
    </>
  );
}
