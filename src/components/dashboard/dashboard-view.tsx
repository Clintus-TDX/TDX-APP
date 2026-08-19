"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { STATUS_MAP } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Users,
  CalendarClock,
  Loader2,
  Briefcase,
  HardHat,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ── Types ──

interface KPIs {
  totalTickets: number;
  openPending: number;
  actionRequired: number;
  completed: number;
  inBilling: number;
  techCancelled: number;
  cancelled: number;
  totalHours: number;
  totalExpenses: number;
  totalIncurred: number;
  totalRevenue: number;
  totalPayroll: number;
}

interface StatusDist {
  status: string;
  count: number;
}

interface RecentTicket {
  id: string;
  ticketId: string;
  clientName: string;
  status: string;
  fieldEngineerName: string;
  hours: number;
  siteLocation: string;
  dateCreated: string;
  etaDlaDate: string | null;
}

interface TopClient {
  clientName: string;
  count: number;
  totalHours: number;
  totalExpenses: number;
}

interface TopEngineer {
  engineerName: string;
  count: number;
  totalHours: number;
}

interface UpcomingTicket {
  id: string;
  ticketId: string;
  clientName: string;
  status: string;
  fieldEngineerName: string;
  etaDlaDate: string | null;
  siteLocation: string;
}

interface DashboardData {
  kpis: KPIs;
  statusDistribution: StatusDist[];
  recentTickets: RecentTicket[];
  topClients: TopClient[];
  topEngineers: TopEngineer[];
  upcomingDue: UpcomingTicket[];
}

interface DetailTicket {
  id: string;
  ticketId: string;
  clientName: string;
  status: string;
  fieldEngineerName: string;
  hours: number;
  expenses: number;
  incurredExpenses: number;
  hourlyRate: number;
  billRate: number;
  siteLocation: string;
  dateCreated: string;
  etaDlaDate: string | null;
  description: string;
  platform: string;
}

// ── Theme-aware status colors ──

const STATUS_THEME: Record<string, { light: string; dark: string; ring: string }> = {
  "ticket-completed":  { light: "bg-emerald-50",  dark: "dark:bg-emerald-950/40", ring: "border-l-emerald-500" },
  "open-pending":      { light: "bg-yellow-50",    dark: "dark:bg-yellow-950/40", ring: "border-l-yellow-500" },
  "open-not-posted":   { light: "bg-amber-50",     dark: "dark:bg-amber-950/40",  ring: "border-l-amber-500" },
  "action-required":   { light: "bg-orange-50",    dark: "dark:bg-orange-950/40", ring: "border-l-orange-500" },
  "tech-cancelled":    { light: "bg-red-50",       dark: "dark:bg-red-950/40",    ring: "border-l-red-400" },
  "cancelled":         { light: "bg-fuchsia-50",   dark: "dark:bg-fuchsia-950/40",ring: "border-l-fuchsia-400" },
  "in-process-billing":{ light: "bg-cyan-50",      dark: "dark:bg-cyan-950/40",  ring: "border-l-cyan-500" },
};

function getStatusTheme(status: string) {
  return STATUS_THEME[status] || { light: "bg-muted", dark: "dark:bg-muted", ring: "border-l-border" };
}

function StatusChip({ status, size = "sm" }: { status: string; size?: "sm" | "xs" }) {
  const def = STATUS_MAP[status];
  const theme = getStatusTheme(status);
  const sz = size === "xs"
    ? "text-[9px] px-1.5 py-px leading-tight"
    : "text-[10px] px-2 py-0.5";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded font-medium border-l-[3px]",
        theme.light, theme.dark, theme.ring,
        sz
      )}
    >
      {def?.label || status}
    </span>
  );
}

// ── Helpers ──

const fmtCurrency = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
};

const fmtHours = (v: number) => {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K hrs`;
  return `${v.toFixed(1)} hrs`;
};

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return d; }
};

// ── KPI Card (clickable) ──

function KPICard({ icon: Icon, label, value, sub, color, onClick, count }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  onClick?: () => void;
  count?: number;
}) {
  const clickable = !!onClick;
  return (
    <Card
      className={cn(
        "transition-all duration-200",
        clickable && "cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] border-2 border-transparent hover:border-primary/40"
      )}
      onClick={clickable ? onClick : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); } : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={cn("rounded-lg p-2", color)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {clickable && (count ?? 0) > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-[10px] text-primary font-medium">Click to view details →</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Financial Card (clickable) ──

function FinCard({ icon: Icon, label, value, color, onClick, iconColor }: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  iconColor: string;
  onClick?: () => void;
}) {
  const clickable = !!onClick;
  return (
    <Card
      className={cn(
        "hover:shadow-md transition-all duration-200",
        clickable && "cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] border-2 border-transparent hover:border-primary/40"
      )}
      onClick={clickable ? onClick : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); } : undefined}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", color)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase">{label}</p>
          <p className="text-sm font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Status Bar ──

const BAR_COLORS: Record<string, { bar: string; dark: string }> = {
  "ticket-completed":   { bar: "bg-emerald-500",  dark: "dark:bg-emerald-400" },
  "open-pending":       { bar: "bg-yellow-400",   dark: "dark:bg-yellow-300" },
  "open-not-posted":    { bar: "bg-amber-400",    dark: "dark:bg-amber-300" },
  "action-required":    { bar: "bg-orange-400",   dark: "dark:bg-orange-300" },
  "tech-cancelled":     { bar: "bg-red-400",      dark: "dark:bg-red-300" },
  "cancelled":          { bar: "bg-fuchsia-400",  dark: "dark:bg-fuchsia-300" },
  "in-process-billing": { bar: "bg-cyan-500",     dark: "dark:bg-cyan-400" },
};

function StatusDistribution({ data, onStatusClick }: { data: StatusDist[]; onStatusClick: (status: string) => void }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Status Distribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {data.length === 0 && <p className="text-xs text-muted-foreground italic">No tickets yet.</p>}
        {data.map(d => {
          const def = STATUS_MAP[d.status];
          const pct = total > 0 ? ((d.count / total) * 100).toFixed(0) : "0";
          const bc = BAR_COLORS[d.status] || { bar: "bg-muted-foreground", dark: "" };
          return (
            <div
              key={d.status}
              className="space-y-0.5 cursor-pointer rounded p-1 -m-1 transition-colors hover:bg-accent/50"
              onClick={() => d.count > 0 && onStatusClick(d.status)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && d.count > 0) onStatusClick(d.status); }}
              title={`Click to view ${def?.label || d.status} tickets`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className={cn("h-2.5 w-2.5 rounded-sm inline-block", bc.bar, bc.dark)} />
                  <span className="font-medium">{def?.label || d.status}</span>
                </span>
                <span className="text-muted-foreground">{d.count} ({pct}%)</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", bc.bar, bc.dark)}
                  style={{
                    width: `${(d.count / maxCount) * 100}%`,
                    minWidth: d.count > 0 ? "4px" : "0px",
                  }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ── Recent Tickets Compact Table ──

function RecentTicketsTable({ tickets }: { tickets: RecentTicket[] }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Recent Tickets
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {tickets.length === 0 && (
          <p className="text-xs text-muted-foreground italic p-4">No tickets yet.</p>
        )}
        <div className="overflow-auto max-h-[280px]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5">Ticket</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5">Client</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5">Engineer</th>
                <th className="text-center font-medium text-muted-foreground px-3 py-1.5">Hrs</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5">Status</th>
                <th className="text-right font-medium text-muted-foreground px-3 py-1.5">Created</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr
                  key={t.id}
                  className="border-b border-border/40 hover:bg-accent/30 transition-colors"
                >
                  <td className="px-3 py-1.5 font-mono font-semibold whitespace-nowrap">{t.ticketId}</td>
                  <td className="px-3 py-1.5 max-w-[120px] truncate text-foreground/80" title={t.clientName}>{t.clientName || "—"}</td>
                  <td className="px-3 py-1.5 max-w-[110px] truncate text-foreground/70" title={t.fieldEngineerName}>{t.fieldEngineerName || "—"}</td>
                  <td className="px-3 py-1.5 text-center font-mono text-foreground/70">{t.hours || 0}h</td>
                  <td className="px-3 py-1.5"><StatusChip status={t.status} size="xs" /></td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground whitespace-nowrap">{fmtDate(t.dateCreated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Top Clients ──

function TopClientsTable({ clients }: { clients: TopClient[] }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5" />
          Top Clients
        </CardTitle>
      </CardHeader>
      <CardContent>
        {clients.length === 0 && <p className="text-xs text-muted-foreground italic">No clients yet.</p>}
        <div className="space-y-1.5">
          {clients.map((c, i) => (
            <div key={c.clientName} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md border border-border/50 text-xs hover:bg-accent/30 transition-colors">
              <div className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                i === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                  : i === 1 ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  : i === 2 ? "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300"
                  : "bg-muted text-muted-foreground"
              )}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{c.clientName}</p>
                <p className="text-muted-foreground">{c.count} tickets · {c.totalHours} hrs</p>
              </div>
              <span className="font-medium tabular-nums">{fmtCurrency(c.totalExpenses)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Top Engineers ──

function TopEngineersTable({ engineers }: { engineers: TopEngineer[] }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <HardHat className="h-3.5 w-3.5" />
          Top Engineers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {engineers.length === 0 && <p className="text-xs text-muted-foreground italic">No engineers yet.</p>}
        <div className="space-y-1.5">
          {engineers.map((e, i) => (
            <div key={e.engineerName} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md border border-border/50 text-xs hover:bg-accent/30 transition-colors">
              <div className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                i === 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                  : i === 1 ? "bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-300"
                  : "bg-muted text-muted-foreground"
              )}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{e.engineerName}</p>
                <p className="text-muted-foreground">{e.count} tickets</p>
              </div>
              <span className="font-medium tabular-nums">{e.totalHours} hrs</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Upcoming Due with Click Filter Handler ──

function UpcomingDueTable({ tickets, onSelectEta }: { tickets: UpcomingTicket[]; onSelectEta: (dateStr: string) => void }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" />
          Upcoming Due (Next 7 Days) — <span className="text-xs font-normal text-muted-foreground">Click row to filter Core Dispatch</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {tickets.length === 0 && (
          <p className="text-xs text-muted-foreground italic p-4">No upcoming tickets.</p>
        )}
        <div className="overflow-auto max-h-[240px]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5">Ticket</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5">Client · Engineer</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5">Status</th>
                <th className="text-right font-medium text-muted-foreground px-3 py-1.5">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => {
                const isOverdue = t.etaDlaDate && new Date(t.etaDlaDate) < new Date();
                return (
                  <tr
                    key={t.id}
                    className={cn(
                      "border-b border-border/40 transition-colors cursor-pointer hover:bg-primary/10",
                      isOverdue ? "bg-red-500/5 dark:bg-red-500/10" : ""
                    )}
                    onClick={() => {
                      if (t.etaDlaDate) {
                        const dateOnly = t.etaDlaDate.split("T")[0];
                        onSelectEta(dateOnly);
                      }
                    }}
                    title="Click to filter Core Dispatch by this ETA Date"
                  >
                    <td className="px-3 py-1.5 font-mono font-semibold whitespace-nowrap">{t.ticketId}</td>
                    <td className="px-3 py-1.5 text-foreground/80 truncate max-w-[200px]" title={`${t.clientName} · ${t.fieldEngineerName}`}>
                      {t.clientName} · {t.fieldEngineerName}
                    </td>
                    <td className="px-3 py-1.5"><StatusChip status={t.status} size="xs" /></td>
                    <td className="px-3 py-1.5 text-right whitespace-nowrap">
                      <span className={cn("font-medium", isOverdue && "text-red-600 dark:text-red-400")}>
                        {t.etaDlaDate ? fmtDate(t.etaDlaDate) : "—"}
                      </span>
                      {isOverdue && <span className="ml-1 text-[9px] text-red-500 font-semibold">OVERDUE</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Detail Dialog ──

type DetailType = "" | "totalTickets" | "openPending" | "actionRequired" | "completed" | "inBilling" | "cancelled" | "techCancelled" | "totalHours" | "revenue" | "payroll" | "expenses" | "netMargin";

function DetailDialog({ type, page, onPageChange, open, onClose }: { type: DetailType; page: number; onPageChange: (p: number) => void; open: boolean; onClose: () => void }) {
  const { data, isLoading } = useQuery<{
    title: string;
    tickets: DetailTicket[];
    total: number;
    page: number;
    pageSize: number;
  }>({
    queryKey: ["dashboard-details", type, page],
    queryFn: () => fetch(`/api/dashboard/details?type=${type}&page=${page}&pageSize=20`).then(r => r.json()),
    enabled: open && !!type,
  });

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;
  const showFinancials = ["totalHours", "revenue", "payroll", "expenses", "netMargin"].includes(type);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[1000px] w-[95vw] h-[80vh] flex flex-col p-6">
        <DialogHeader className="pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {data?.title || "Details"}
            {!isLoading && data && (
              <span className="text-sm font-normal text-muted-foreground">
                ({data.total} ticket{data.total !== 1 ? "s" : ""})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto flex flex-col min-h-0 pt-4">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data && Array.isArray(data.tickets) && data.tickets.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No tickets found for this category.</p>
            </div>
          ) : data && Array.isArray(data.tickets) && data.tickets.length > 0 ? (
            <>
              <div className="flex-1 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs whitespace-nowrap">Ticket ID</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">Client</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">Engineer</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">Location</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">Hours</TableHead>
                      {showFinancials && (
                        <>
                          <TableHead className="text-xs whitespace-nowrap text-right">Pay Rate</TableHead>
                          <TableHead className="text-xs whitespace-nowrap text-right">Bill Rate</TableHead>
                          <TableHead className="text-xs whitespace-nowrap text-right">Expenses</TableHead>
                          {type === "netMargin" && (
                            <TableHead className="text-xs whitespace-nowrap text-right">Margin</TableHead>
                          )}
                        </>
                      )}
                      <TableHead className="text-xs whitespace-nowrap">Due Date</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tickets.map(t => {
                      const margin = (t.hours || 0) * (Number(t.billRate) || 0) - (t.hours || 0) * (Number(t.hourlyRate) || 0) - (Number(t.expenses) || 0);
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs font-medium whitespace-nowrap font-mono">{t.ticketId}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{t.clientName || "—"}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap"><StatusChip status={t.status} /></TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{t.fieldEngineerName || "—"}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate" title={t.siteLocation || ""}>{t.siteLocation || "—"}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap font-mono">{t.hours || 0}h</TableCell>
                          {showFinancials && (
                            <>
                              <TableCell className="text-xs whitespace-nowrap text-right font-mono">{fmtCurrency(Number(t.hourlyRate) || 0)}/hr</TableCell>
                              <TableCell className="text-xs whitespace-nowrap text-right font-mono">{fmtCurrency(Number(t.billRate) || 0)}/hr</TableCell>
                              <TableCell className="text-xs whitespace-nowrap text-right font-mono">{fmtCurrency(Number(t.expenses) || 0)}</TableCell>
                              {type === "netMargin" && (
                                <TableCell className={cn("text-xs whitespace-nowrap text-right font-mono font-medium", margin >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                  {fmtCurrency(margin)}
                                </TableCell>
                              )}
                            </>
                          )}
                          <TableCell className="text-xs whitespace-nowrap">{t.etaDlaDate ? fmtDate(t.etaDlaDate) : "—"}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{fmtDate(t.dateCreated)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 shrink-0">
                  <p className="text-xs text-muted-foreground">
                    Page {data.page} of {totalPages} ({data.total} total)
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 px-2" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs px-2">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" className="h-7 px-2" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Dashboard ──

export function DashboardView({ onNavigate }: { onNavigate?: (tab: string, extra?: any) => void }) {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then(r => r.json()),
    refetchOnWindowFocus: false,
  });

  const [detailType, setDetailType] = useState<DetailType>("");
  const [detailPage, setDetailPage] = useState(1);

  const openDetail = (t: DetailType) => {
    setDetailType(t);
    setDetailPage(1);
  };

  const handleStatusClick = (status: string) => {
    const map: Record<string, DetailType> = {
      "open-pending": "openPending",
      "open-not-posted": "openPending",
      "action-required": "actionRequired",
      "ticket-completed": "completed",
      "in-process-billing": "inBilling",
      "tech-cancelled": "techCancelled",
      "cancelled": "cancelled",
    };
    openDetail(map[status] || "totalTickets");
  };

  const handleEtaFilter = (dateStr: string) => {
    if (onNavigate) {
      onNavigate("dispatch", { dueDate: dateStr });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const d = data;
  if (!d) return null;

  const kpis = d.kpis;
  const profit = kpis.totalRevenue - kpis.totalPayroll - kpis.totalExpenses;

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <div className="h-6 w-1.5 rounded brand-gradient" />
          Dashboard
        </h2>
        <div className="flex-1" />
        <p className="text-xs text-muted-foreground">
          Click any card to view details or filter Core Dispatch
        </p>
      </div>

      {/* ── KPI Cards Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          icon={ClipboardList} label="Total Tickets"
          value={String(kpis.totalTickets)}
          sub={`${kpis.completed} completed`}
          color="bg-primary/10 text-primary"
          onClick={() => openDetail("totalTickets")}
          count={kpis.totalTickets}
        />
        <KPICard
          icon={Clock} label="Open / Pending"
          value={String(kpis.openPending)}
          sub={`${kpis.inBilling} in billing`}
          color="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
          onClick={() => openDetail("openPending")}
          count={kpis.openPending}
        />
        <KPICard
          icon={AlertTriangle} label="Action Required"
          value={String(kpis.actionRequired)}
          color="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
          onClick={() => openDetail("actionRequired")}
          count={kpis.actionRequired}
        />
        <KPICard
          icon={CheckCircle2} label="Completed"
          value={String(kpis.completed)}
          sub={kpis.totalTickets > 0 ? `${((kpis.completed / kpis.totalTickets) * 100).toFixed(0)}% completion` : undefined}
          color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          onClick={() => openDetail("completed")}
          count={kpis.completed}
        />
        <KPICard
          icon={TrendingUp} label="Total Hours"
          value={fmtHours(kpis.totalHours)}
          sub={kpis.totalTickets > 0 ? `${(kpis.totalHours / kpis.totalTickets).toFixed(1)} avg/ticket` : undefined}
          color="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
          onClick={() => openDetail("totalHours")}
          count={kpis.totalHours > 0 ? kpis.totalTickets : 0}
        />
        <KPICard
          icon={DollarSign} label="Est. Revenue"
          value={fmtCurrency(kpis.totalRevenue)}
          sub={profit >= 0 ? `Profit: ${fmtCurrency(profit)}` : `Loss: ${fmtCurrency(Math.abs(profit))}`}
          color="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
          onClick={() => openDetail("revenue")}
          count={kpis.totalTickets}
        />
      </div>

      {/* ── Financial Summary Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <FinCard
          icon={DollarSign} label="Est. Revenue"
          value={fmtCurrency(kpis.totalRevenue)}
          color="bg-emerald-100 dark:bg-emerald-900/40"
          iconColor="text-emerald-600 dark:text-emerald-400"
          onClick={() => openDetail("revenue")}
        />
        <FinCard
          icon={Users} label="Payroll (Est.)"
          value={fmtCurrency(kpis.totalPayroll)}
          color="bg-orange-100 dark:bg-orange-900/40"
          iconColor="text-orange-600 dark:text-orange-400"
          onClick={() => openDetail("payroll")}
        />
        <FinCard
          icon={TrendingUp} label="Expenses"
          value={fmtCurrency(kpis.totalExpenses)}
          color="bg-red-100 dark:bg-red-900/40"
          iconColor="text-red-600 dark:text-red-400"
          onClick={() => openDetail("expenses")}
        />
        <FinCard
          icon={DollarSign} label="Net Margin (Est.)"
          value={fmtCurrency(profit)}
          color={profit >= 0 ? "bg-green-100 dark:bg-green-900/40" : "bg-red-100 dark:bg-red-900/40"}
          iconColor={profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
          onClick={() => openDetail("netMargin")}
        />
      </div>

      {/* ── Middle Row: Status Dist + Recent Tickets ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatusDistribution data={d.statusDistribution} onStatusClick={handleStatusClick} />
        <div className="lg:col-span-2">
          <RecentTicketsTable tickets={d.recentTickets} />
        </div>
      </div>

      {/* ── Bottom Row: Top Clients + Top Engineers + Upcoming Due ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TopClientsTable clients={d.topClients} />
        <TopEngineersTable engineers={d.topEngineers} />
        <UpcomingDueTable tickets={d.upcomingDue} onSelectEta={handleEtaFilter} />
      </div>

      {/* ── Detail Dialog ── */}
      <DetailDialog
        type={detailType}
        page={detailPage}
        onPageChange={setDetailPage}
        open={!!detailType}
        onClose={() => setDetailType("")}
      />
    </div>
  );
}