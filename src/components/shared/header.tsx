"use client";

import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import {
  Sun,
  Moon,
  Database,
  LogOut,
  HelpCircle,
  Settings,
  ChevronDown,
} from "lucide-react";
import { COMPANY } from "@/lib/constants";
import { isSuperAdmin } from "@/lib/auth-types";
import { type AppTab } from "./sidebar";

interface HeaderProps {
  onToggleHelp: () => void;
  onNavigate?: (tab: AppTab) => void;
}

export function Header({ onToggleHelp, onNavigate }: HeaderProps) {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  const initials = user?.name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 sticky top-0 z-40 no-print">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2 shrink-0">
        <Image
          src="/techadox-logo.png"
          alt="Techadox"
          width={32}
          height={28}
          className="object-contain"
        />
        <span className="text-sm font-bold brand-gradient-text hidden sm:inline">
          {COMPANY.name}
        </span>
      </div>

      {/* Accent bar */}
      <div className="h-6 w-1 rounded brand-gradient hidden md:block" />

      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Data Store Badge (Super Admin) */}
        {isSuperAdmin(user) && (
          <Badge variant="outline" className="hidden sm:flex items-center gap-1 text-xs border-emerald-500 text-emerald-600 dark:text-emerald-400">
            <Database className="h-3 w-3" />
            Data Store: Connected
          </Badge>
        )}

        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" onClick={toggleDarkMode} title={darkMode ? "Light mode" : "Dark mode"}>
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-1.5 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline max-w-[140px] truncate">
                {user?.name}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Role: <span className="font-medium text-foreground">{user?.role}</span>
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onToggleHelp}>
              <HelpCircle className="mr-2 h-4 w-4" />
              Help &amp; Guide
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate?.("admin")}>
              <Settings className="mr-2 h-4 w-4" />
              <span className="flex-1">Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
