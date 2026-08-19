"use client";

import { useState, useEffect, useMemo } from "react";
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
  comments: string;
  notes: string;
  dateCreated: string;
  dateModified: string;
  _count: { attachments: number };
}

interface AttachmentItem {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  order: number;
  filePath: string;
}

export function DispatchView() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // State
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [engineerFilter, setEngineerFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState("");
  const [sortCol, setSortCol] = useState("dateCreated");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(user?.pageSize || 10);
  const [showIntake, setShowIntake] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Auto-dismiss toast
  useEffect(() => { if (toast) setTimeout(() => setToast(null), 3000); }, [toast]);

  // Active filter helpers
  const hasActiveFilters = statusFilter !== "all" || clientFilter !== "all" || engineerFilter !== "all" || platformFilter !== "all" || !!dueDateFilter;
  const resetFilters = () => { setStatusFilter("all"); setClientFilter("all"); setEngineerFilter("all"); setPlatformFilter("all"); setDueDateFilter(""); };

  // Fetch lookups
  const { data: clientsData } = useQuery({ queryKey: ["clients"], queryFn: () => fetch("/api/clients").then(r => r.json()) });
  const { data: engineersData } = useQuery({ queryKey: ["engineers"], queryFn: () => fetch("/api/engineers").then(r => r.json()) });
  const { data: platformsData } = useQuery({ queryKey: ["platforms"], queryFn: () => fetch("/api/platforms").then(r => r.json()) });

  // Visible columns
  const columnOrder = useMemo(() => {
    try {
      const saved = user?.columnOrder ? JSON.parse(user.columnOrder) : null;
      return Array.isArray(saved) && saved.length > 0 ? saved : DEFAULT_COLUMN_ORDER;
    } catch {
      return DEFAULT_COLUMN_ORDER;
    }
  }, [user?.columnOrder]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Build query params
  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (statusFilter && statusFilter !== "all") p.set("status", statusFilter);
    if (clientFilter && clientFilter !== "all") p.set("client", clientFilter);
    if (engineerFilter && engineerFilter !== "all") p.set("engineer", engineerFilter);
    if (platformFilter && platformFilter !== "all") p.set("platform", platformFilter);
    if (dueDateFilter) p.set("dueDate", dueDateFilter);
    p.set("sort", sortCol);
    p.set("dir", sortDir);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    return p.toString();
  }, [search, statusFilter, clientFilter, engineerFilter, platformFilter, dueDateFilter, sortCol, sortDir, page, pageSize]);

  // Fetch work orders
  const { data, isLoading, refetch } = useQuery<{ rows: WorkOrderRow[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>({
    queryKey: ["workorders", queryParams],
    queryFn: () => fetch(`/api/workorders?${queryParams}`).then(r => r.json()),
    refetchOnWindowFocus: false,
  });

  const rows = data?.rows || [];
  const pagination = data?.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 0 };

  // Column visibility
  const visibleCols = GRID_COLUMNS.filter(c => columnOrder.includes(c.key));
  const colMap = useMemo(() => {
    const m: Record<string, typeof GRID_COLUMNS[0]> = {};
    for (const c of GRID_COLUMNS) m[c.key] = c;
    return m;
  }, []);

  // Status change mutation
  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return fetch(`/api/workorders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workorders"] }); setToast("Status updated"); },
  });

  // Delete mutation
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      return fetch(`/api/workorders/${id}`, { method: "DELETE" });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workorders"] }); setDeleteConfirm(null); setToast("Work order deleted"); },
  });

  // Sort handler
  const handleSort = (key: string) => {
    if (sortCol === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  // Format date
  const fmtDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    } catch { return d; }
  };

  // Format currency
  const fmtCurrency = (v: number) => `$${v.toFixed(2)}`;

  // Get cell value
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
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Toast */}
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
        <Button size="sm" onClick={() => setShowIntake(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Ticket
        </Button>
      </div>

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

      {/* Data Grid */}
      <div className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden">
        <div className="custom-scroll h-full overflow-scroll" style={{ scrollbarWidth: "thin" }}>
          <div className="min-w-[1100px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                {visibleCols.map(col => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none h-7 px-2.5 sticky top-0 z-10 bg-muted",
                      col.sortable && "hover:bg-muted",
                      sortCol === col.key && "text-primary"
                    )}
                    style={col.width ? { minWidth: col.width, width: col.width } : undefined}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortCol === col.key && (
                        <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider h-7 px-2.5 w-10 sticky top-0 z-10 bg-muted">Actions</TableHead>
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
                    No work orders found. Click &quot;New Ticket&quot; to create one.
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
                      {visibleCols.map(col => (
                        <TableCell
                          key={col.key}
                          className="px-2.5 py-0.5 text-xs whitespace-nowrap max-w-[200px] truncate"
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
                      ))}
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