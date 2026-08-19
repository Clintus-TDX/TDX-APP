"use client";

import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  FileText,
  Shield,
  Landmark,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export type AppTab = "dashboard" | "dispatch" | "reports" | "invoices" | "admin" | "accounts";

interface SidebarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const NAV_ITEMS: { key: AppTab; label: string; icon: React.ElementType; roles?: string[] }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "dispatch", label: "Core Dispatch", icon: ClipboardList },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "invoices", label: "Invoices", icon: FileText },
  { key: "admin", label: "Admin & Settings", icon: Shield },
  { key: "accounts", label: "Accounts", icon: Landmark, roles: ["Super Admin"] },
];

export function Sidebar({ activeTab, onTabChange, collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) =>
      !item.roles ||
      item.roles.some((r) => r === user?.role)
  );

  return (
    <aside
      className={cn(
        "h-full border-r border-sidebar-border bg-sidebar flex flex-col transition-all duration-200 no-print",
        collapsed ? "w-14" : "w-56"
      )}
    >
      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-1 px-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <Button
                key={item.key}
                variant={active ? "secondary" : "ghost"}
                className={cn(
                  "justify-start gap-2 h-9",
                  collapsed && "justify-center px-0",
                  active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                )}
                onClick={() => onTabChange(item.key)}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="text-sm truncate">{item.label}</span>}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center h-8"
          onClick={onToggle}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
