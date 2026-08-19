"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import {
  STATUSES,
  STATUS_MAP,
  GRID_COLUMNS,
  DEFAULT_COLUMN_ORDER,
  PAGE_SIZE_OPTIONS,
} from "@/lib/constants";
import { TicketIntakeForm } from "./ticket-intake-form";
import { AuditBoard } from "./audit-board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  X,
  Trash2,
  CheckCircle,
  CalendarDays,
  ClipboardList,
  AlertTriangle,
  FileText,
  DollarSign,
  ArrowLeft,
  ArrowRight,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkOrderRow {
  id: string;
  ticketId: string;
  clientId: string | null;
  clientName: string;
  jobPlatformId: string | null;
  jobPlatformName: string;
  status: string;
  customerReferences: string;
  siteLocation: string;
  payRatePrimary: string;
  payRateSecondary: string;
  fieldEngineerId: string | null;
  fieldEngineerName: string;
  hours: number;
  expenses: number;
  incurredExpenses: number;
  hourlyRate: number;
  billRate: number;
  flatRate: number;
  comments: string;
  notes: string;
  dateCreated: string;
  dateModified: string;
  _count: { attachments: number };
}

interface DispatchViewProps {
  initialFilter?: { dueDate?: string; status?: string; customFilter?: string };
}

export function DispatchView({ initialFilter }: DispatchViewProps) {
  const { user } = useAuth();
  const qc = useQueryClient();

  // State
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialFilter?.status || "all");
  const [clientFilter, setClientFilter] = useState("all");
  const [engineerFilter, setEngineerFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState(initialFilter?.dueDate || "");
  const [activeTabFilter, setActiveTabFilter] = useState<string | null>(initialFilter?.customFilter || null);
  
  const [sortCol, setSortCol] = useState("dateCreated");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(user?.pageSize || 10);
  const [showIntake, setShowIntake] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Column Customization State (Order & Widths initialized from user session profile)
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      const saved = user?.columnOrder ? JSON.parse(user.columnOrder) : null;
      return Array.isArray(saved) && saved.length > 0 ? saved : DEFAULT_COLUMN_ORDER;
    } catch {
      return DEFAULT_COLUMN_ORDER;
    }
  });

  // Sync column order whenever session updates
  useEffect(() => {
    if (user?.columnOrder) {
      try {
        const parsed = JSON.parse(user.columnOrder);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setColumnOrder(parsed);
        }
      } catch {}
    }
  }, [user?.columnOrder]);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  // Save preferences mutation to database
  const savePreferencesMut = useMutation({
    mutationFn: async (orderToSave: string[]) => {
      const res = await fetch("/api/users/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnOrder: JSON.stringify(orderToSave), pageSize }),
      });
      if (!res.ok) throw new Error("Failed to save preferences");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth-user"] });
      setToast("Layout saved successfully to your profile!");
    },
    onError: () => {
      setToast("Failed to save layout preferences.");
    },
  });

  // Move column left or right
  const moveColumn = (index: number, direction: "left" | "right") => {
    const newOrder = [...columnOrder];
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    setColumnOrder(newOrder);
  };

  // Handle column resizing (Null-safe)
  const startResizing = (e: React.MouseEvent, key: string, currentWidth: number) => {
    e.preventDefault();
    resizingRef.current = { key, startX: e.clientX, startWidth: currentWidth || 130 };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const currentRef = resizingRef.current;
      const diff = moveEvent.clientX - currentRef.startX;
      const newWidth = Math.max(70, currentRef.startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [currentRef.key]: newWidth }));
    };

    const onMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  useEffect(() => { if (toast) setTimeout(() => setToast(null), 3000); }, [toast]);

  const hasActiveFilters = statusFilter !== "all" || clientFilter !== "all" || engineerFilter !== "all" || platformFilter !== "all" || !!dueDateFilter || !!activeTabFilter;
  const resetFilters = () => { 
    setStatusFilter("all"); 
    setClientFilter("all"); 
    setEngineerFilter("all"); 
    setPlatformFilter("all"); 
    setDueDateFilter(""); 
    setActiveTabFilter(null);
  };

  // Fetch lookups
  const { data: clientsData } = useQuery({ queryKey: ["clients"], queryFn: () => fetch("/api/clients").then(r => r.json()) });
  const { data: engineersData } = useQuery({ queryKey: ["engineers"], queryFn: () => fetch("/api/engineers").then(r => r.json()) });
  const { data: platformsData } = useQuery({ queryKey: ["platforms"], queryFn: () => fetch("/api/platforms").then(r => r.json()) });

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    
    if (activeTabFilter === "closing-notes") {
      p.set("status", "action-required");
    } else if (activeTabFilter === "abandoned") {
      p.set("status", "tech-cancelled");
    } else if (activeTabFilter === "billing") {
      p.set("status", "in-process-billing");
    } else if (statusFilter && statusFilter !== "all") {
      p.set("status", statusFilter);
    }

    if (clientFilter && clientFilter !== "all") p.set("client", clientFilter);
    if (engineerFilter && engineerFilter !== "all") p.set("engineer", engineerFilter);
    if (platformFilter && platformFilter !== "all") p.set("platform", platformFilter);
    if (dueDateFilter) p.set("dueDate", dueDateFilter);
    p.set("sort", sortCol);
    p.set("dir", sortDir);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    return p.toString();
  }, [search, statusFilter, clientFilter, engineerFilter, platformFilter, dueDateFilter, activeTabFilter, sortCol, sortDir, page, pageSize]);

  const { data, isLoading } = useQuery<{ rows: WorkOrderRow[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>({
    queryKey: ["workorders", queryParams],
    queryFn: () => fetch(`/api/workorders?${queryParams}`).then(r => r.json()),
    refetchOnWindowFocus: false,
  });

  const { data: allData } = useQuery<{ rows: WorkOrderRow[] }>({
    queryKey: ["workorders-all-metrics"],
    queryFn: () => fetch(`/api/workorders?pageSize=500`).then(r => r.json()),
    refetchOnWindowFocus: false,
  });

  const rows = data?.rows || [];
  const pagination = data?.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 0 };
  const allRows = allData?.rows || [];

  const closingNotesCount = allRows.filter(r => r.status === "action-required").length;
  const abandonedCount = allRows.filter(r => r.status === "tech-cancelled").length;
  const billingCount = allRows.filter(r => r.status === "in-process-billing").length;

  const totalPayout = allRows.reduce((acc, r) => acc + ((r.hours || 0) * (r.hourlyRate || 0) + (r.expenses || 0)), 0);
  const totalInvoice = allRows.reduce((acc, r) => acc + ((r.flatRate || 0) > 0 ? r.flatRate : (r.hours || 0) * (r.billRate || 0) + (r.expenses || 0)), 0);
  const operatingMargin = totalInvoice > 0 ? (((totalInvoice - totalPayout) / totalInvoice) * 100).toFixed(1) : "0.0";

  const visibleCols = GRID_COLUMNS.filter(c => columnOrder.includes(c.key));

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return fetch(`/api/workorders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workorders"] }); setToast("Status updated"); },
  });

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      return fetch(`/api/workorders/${id}`, { method: "DELETE" });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workorders"] }); setDeleteConfirm(null); setToast("Work order deleted"); },
  });

  const handleSort = (key: string) => {
    if (sortCol === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const fmtDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    } catch { return d; }
  };

  const fmtCurrency = (v: number) => `$${v.toFixed(2)}`;

  const getCell = (row: WorkOrderRow, key: string) => {
    switch (key) {
      case "ticketId": return row.ticketId;
      case "clientName": return row.clientName;
      case "jobPlatformName": return row.jobPlatformName;
      case "status": return row.status;
      case "siteLocation": return row.siteLocation;
      case "fieldEngineerName": return row.fieldEngineerName;
      case "payRatePrimary": return row.payRatePrimary;
      case "payRateSecondary": return row.payRateSecondary;
      case "hours": return row.hours.toFixed(1);
      case "expenses": return fmtCurrency(row.expenses);
      case "hourlyRate": return fmtCurrency(row.hourlyRate);
      case "incurredExpenses": return fmtCurrency(row.incurredExpenses);
      case "dateCreated": return fmtDate(row.dateCreated);
      case "dateModified": return fmtDate(row.dateModified);
      case "customerReferences": return row.customerReferences;
      case "comments": return row.comments;
      default: return "";
    }
  };

  const clients = (clientsData?.clients as { id: string; name: string }[]) || [];
  const engineers = (engineersData?.engineers as { id: string; name: string }[]) || [];
  const platforms = (platformsData?.platforms as { id: string; name: string }[]) || [];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4">
      {toast && (
        <div className="fixed top-16 right-4 z-50 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {toast}
          <button onClick={() => setToast(null)} className="ml-1 hover:opacity-70"><X className="h-3 w-3" /></button>
        </div>
      )}

      {/* Header row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <div className="h-6 w-1.5 rounded brand-gradient" />
          Core Dispatch
        </h2>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => savePreferencesMut.mutate(columnOrder)}
            disabled={savePreferencesMut.isPending}
            className="gap-1.5"
            title="Permanently save your current column arrangement and widths"
          >
            {savePreferencesMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Layout Preferences
          </Button>
          <Button size="sm" onClick={() => setShowIntake(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Summary Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        <div
          onClick={() => { setActiveTabFilter(activeTabFilter === "closing-notes" ? null : "closing-notes"); setPage(1); }}
          className={cn(
            "p-4 rounded-lg border cursor-pointer transition-all shadow-sm hover:scale-[1.01]",
            activeTabFilter === "closing-notes" ? "bg-amber-500 text-slate-950 font-semibold ring-2 ring-primary border-primary" : "bg-amber-400 text-slate-950 border-border/60"
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Closing Notes Overdue</span>
            <ClipboardList className="h-4 w-4 opacity-70" />
          </div>
          <p className="text-2xl font-bold tracking-tight">{closingNotesCount} Ticket{closingNotesCount !== 1 ? "s" : ""}</p>
          <span className="text-[9px] font-medium tracking-tight uppercase opacity-75">Orange Overdue Action</span>
        </div>

        <div
          onClick={() => { setActiveTabFilter(activeTabFilter === "abandoned" ? null : "abandoned"); setPage(1); }}
          className={cn(
            "p-4 rounded-lg border cursor-pointer transition-all shadow-sm hover:scale-[1.01]",
            activeTabFilter === "abandoned" ? "bg-red-600 text-white ring-2 ring-destructive border-destructive" : "bg-card text-card-foreground border-border/60 hover:bg-muted/50"
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", activeTabFilter === "abandoned" ? "text-white/90" : "text-muted-foreground")}>Abandoned Dispatches</span>
            <AlertTriangle className={cn("h-4 w-4", activeTabFilter === "abandoned" ? "text-white" : "text-destructive")} />
          </div>
          <p className="text-2xl font-bold tracking-tight">{abandonedCount} Ticket{abandonedCount !== 1 ? "s" : ""}</p>
          <span className={cn("text-[9px] font-medium tracking-tight uppercase", activeTabFilter === "abandoned" ? "text-white/80" : "text-destructive/80")}>Canceled Out Alert</span>
        </div>

        <div
          onClick={() => { setActiveTabFilter(activeTabFilter === "billing" ? null : "billing"); setPage(1); }}
          className={cn(
            "p-4 rounded-lg border cursor-pointer transition-all shadow-sm hover:scale-[1.01]",
            activeTabFilter === "billing" ? "bg-cyan-700 text-white ring-2 ring-cyan-500 border-cyan-500" : "bg-card text-card-foreground border-border/60 hover:bg-muted/50"
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", activeTabFilter === "billing" ? "text-white/90" : "text-muted-foreground")}>Process of Billing</span>
            <FileText className={cn("h-4 w-4", activeTabFilter === "billing" ? "text-white" : "text-cyan-600")} />
          </div>
          <p className="text-2xl font-bold tracking-tight">{billingCount} Ticket{billingCount !== 1 ? "s" : ""}</p>
          <span className={cn("text-[9px] font-medium tracking-tight uppercase", activeTabFilter === "billing" ? "text-white/80" : "text-cyan-600")}>Cyan Active Billing</span>
        </div>

        <div className="p-4 rounded-lg border border-border/60 bg-card text-card-foreground shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Revenue Summary (MTD)</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xs space-y-1">
            <div className="flex justify-between items-center font-mono">
              <span className="text-muted-foreground">Payout:</span>
              <span className="font-semibold">{fmtCurrency(totalPayout)}</span>
            </div>
            <div className="flex justify-between items-center font-mono border-b border-border/60 pb-1">
              <span className="text-muted-foreground">Invoice:</span>
              <span className="font-semibold">{fmtCurrency(totalInvoice)}</span>
            </div>
            <div className="flex justify-between items-center pt-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Operating Margin</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">{operatingMargin}%</span>
            </div>
          </div>
        </div>
      </div>

      {activeTabFilter && (
        <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border border-primary/20 rounded-md text-xs text-primary shrink-0">
          <span>
            <strong>ALERT SHORTCUT ACTIVE:</strong> Filtering board strictly to reveal tickets logged under{" "}
            <span className="underline font-semibold">
              {activeTabFilter === "closing-notes" && "Action Required (Closing Notes Needed)"}
              {activeTabFilter === "abandoned" && "Tech Cancelled / Abandoned"}
              {activeTabFilter === "billing" && "In Process of Billing"}
            </span>.
          </span>
          <Button size="sm" variant="ghost" onClick={() => setActiveTabFilter(null)} className="h-6 text-xs text-primary hover:bg-primary/20">
            Clear Filter
          </Button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-3 shrink-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticket ID, client, engineer, location..."
            className="pl-9"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className={cn("w-[170px] h-9", statusFilter !== "all" && "border-primary ring-1 ring-primary/30")}><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map(s => (
                <SelectItem key={s.key} value={s.key}>
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm inline-block border border-black/10" style={{ backgroundColor: s.bg }} />
                    {s.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={clientFilter} onValueChange={v => { setClientFilter(v); setPage(1); }}>
            <SelectTrigger className={cn("w-[150px] h-9", clientFilter !== "all" && "border-primary ring-1 ring-primary/30")}><SelectValue placeholder="Client" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={engineerFilter} onValueChange={v => { setEngineerFilter(v); setPage(1); }}>
            <SelectTrigger className={cn("w-[160px] h-9", engineerFilter !== "all" && "border-primary ring-1 ring-primary/30")}><SelectValue placeholder="Engineer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Engineers</SelectItem>
              {engineers.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={platformFilter} onValueChange={v => { setPlatformFilter(v); setPage(1); }}>
            <SelectTrigger className={cn("w-[140px] h-9", platformFilter !== "all" && "border-primary ring-1 ring-primary/30")}><SelectValue placeholder="Platform" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              className={cn("w-[155px] h-9 pl-8", dueDateFilter && "border-primary ring-1 ring-primary/30")}
              value={dueDateFilter}
              onChange={e => { setDueDateFilter(e.target.value); setPage(1); }}
              placeholder="Due Date"
            />
          </div>
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" onClick={resetFilters} className="h-9 text-xs text-muted-foreground gap-1">
              <X className="h-3 w-3" /> Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Data Grid with Click-to-Rearrange & Resizable Headers */}
      <div className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden">
        <div className="custom-scroll h-full overflow-scroll" style={{ scrollbarWidth: "thin" }}>
          <div className="min-w-[1100px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                {visibleCols.map((col, index) => {
                  const width = columnWidths[col.key] || (col.width ? parseInt(String(col.width)) : 130);
                  return (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "relative text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap select-none h-8 px-2.5 sticky top-0 z-10 bg-muted group",
                        sortCol === col.key && "text-primary"
                      )}
                      style={{ minWidth: width, width: width }}
                    >
                      <div className="flex items-center justify-between gap-1 h-full">
                        <div className="flex items-center gap-1.5 flex-1 overflow-hidden cursor-pointer" onClick={() => col.sortable && handleSort(col.key)}>
                          <span className="truncate">{col.label}</span>
                          {col.sortable && sortCol === col.key && (
                            <span className="text-[10px] shrink-0">{sortDir === "asc" ? "▲" : "▼"}</span>
                          )}
                        </div>
                        
                        {/* Rearrange buttons on hover */}
                        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 bg-muted/90 px-1 rounded">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); moveColumn(index, "left"); }}
                              className="p-0.5 hover:text-primary transition-colors"
                              title="Move Left"
                            >
                              <ArrowLeft className="h-3 w-3" />
                            </button>
                          )}
                          {index < visibleCols.length - 1 && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); moveColumn(index, "right"); }}
                              className="p-0.5 hover:text-primary transition-colors"
                              title="Move Right"
                            >
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        {/* Resizer handle */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50 group-hover:bg-primary/30 transition-colors"
                          onMouseDown={(e) => startResizing(e, col.key, width)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TableHead>
                  );
                })}
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider h-8 px-2.5 w-10 sticky top-0 z-10 bg-muted">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={visibleCols.length + 1} className="h-32 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleCols.length + 1} className="h-32 text-center text-muted-foreground">
                    No work orders found matching this filter. Click &quot;New Ticket&quot; to create one.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const statusDef = STATUS_MAP[row.status];
                  return (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer border-b border-border/50 transition-colors"
                      style={{
                        backgroundColor: statusDef?.bg || "#FFFFFF",
                        color: statusDef?.text || "#000000",
                      }}
                      onClick={() => setAuditId(row.id)}
                    >
                      {visibleCols.map(col => {
                        const width = columnWidths[col.key] || (col.width ? parseInt(String(col.width)) : 130);
                        return (
                          <TableCell
                            key={col.key}
                            className="px-2.5 py-0.5 text-xs truncate"
                            style={{ maxWidth: width, width: width }}
                          >
                            {col.key === "status" ? (
                              <div onClick={e => e.stopPropagation()}>
                              <Select
                                value={row.status}
                                onValueChange={v => statusMut.mutate({ id: row.id, status: v })}
                              >
                                <SelectTrigger
                                  className="h-6 min-h-0 py-0 text-[11px] px-1.5 border-0 shadow-none focus:ring-0 focus:ring-offset-0"
                                  style={{
                                    backgroundColor: STATUS_MAP[row.status]?.bg || "#fff",
                                    color: STATUS_MAP[row.status]?.text || "#000",
                                  } as React.CSSProperties}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUSES.map(s => (
                                    <SelectItem key={s.key} value={s.key}>
                                      <span className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-sm inline-block border border-black/10" style={{ backgroundColor: s.bg }} />
                                        <span style={{ color: s.text === "#FFFFFF" ? "#333" : s.text }}>{s.label}</span>
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              </div>
                            ) : (
                              getCell(row, col.key)
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="px-2.5 py-0.5 w-10">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 min-h-0"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(row.id); }}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm shrink-0 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Rows per page:</span>
          <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground ml-2">
            {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, pagination.total)} of {pagination.total}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(1)}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-muted-foreground">Page {page} of {pagination.totalPages || 1}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pagination.totalPages} onClick={() => setPage(pagination.totalPages)}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Ticket Intake Modal */}
      {showIntake && (
        <TicketIntakeForm
          open={showIntake}
          onClose={() => setShowIntake(false)}
          onSubmit={() => { setShowIntake(false); qc.invalidateQueries({ queryKey: ["workorders"] }); setToast("Work order created"); }}
        />
      )}

      {/* Edit Ticket Slide-Out */}
      {auditId && (
        <AuditBoard
          workOrderId={auditId}
          onClose={() => setAuditId(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["workorders"] }); setToast("Work order updated"); }}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Work Order</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this work order? This action cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMut.mutate(deleteConfirm)} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}