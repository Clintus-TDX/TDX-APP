"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  DollarSign,
  Plus,
  Eye,
  Edit3,
  Trash2,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  Download,
  FileDown,
  ArrowLeft,
  Maximize2,
  Printer,
  CreditCard,
  CalendarDays,
  Building2,
  User,
  MonitorSmartphone,
  Copy,
  X,
} from "lucide-react";
import Image from "next/image";
import { COMPANY } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string | null;
  clientName: string;
  workOrderIds: string;
  vendorName: string;
  vendorAddress: string;
  vendorTaxId: string;
  billToName: string;
  billToAddress: string;
  lineItems: string;
  taxRate: number;
  notes: string;
  signature: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  tax: number;
  total: number;
  jobPlatformName: string;
  payRatePrimary: string;
  payRateSecondary: string;
  fieldEngineerName: string;
  payments?: Payment[];
  createdAt?: string;
  updatedAt?: string;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  scheduledDate: string | null;
  createdAt: string;
}

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoiceFieldOption {
  key: string;
  label: string;
}

export const INVOICE_FIELD_OPTIONS: InvoiceFieldOption[] = [
  { key: "invoiceNumber", label: "Invoice Number" },
  { key: "submittedDate", label: "Submitted Date" },
  { key: "billToName", label: "Bill To (Name)" },
  { key: "billToAddress", label: "Bill To (Address)" },
  { key: "billToPhone", label: "Bill To (Phone)" },
  { key: "billToEmail", label: "Bill To (Email)" },
  { key: "purchaseOrder", label: "Purchase Order" },
  { key: "paymentTerms", label: "Payment Terms" },
  { key: "dueDate", label: "Due Date" },
  { key: "lineDescription", label: "Line Description" },
  { key: "hoursQty", label: "Hours / Qty" },
  { key: "billRate", label: "Bill Rate" },
  { key: "totalAmount", label: "Total Amount" },
  { key: "notes", label: "Notes" },
  { key: "subtotal", label: "Subtotal" },
  { key: "tax", label: "Tax" },
  { key: "totalDue", label: "Total Due" },
];

export const DEFAULT_INVOICE_FIELDS = INVOICE_FIELD_OPTIONS.reduce(
  (acc, f) => ({ ...acc, [f.key]: true }),
  {} as Record<string, boolean>
);

export function InvoicesView() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createWos, setCreateWos] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({ ...DEFAULT_INVOICE_FIELDS });
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => { if (toast) setTimeout(() => setToast(null), 3000); }, [toast]);

  // Fetch invoices
  const { data, isLoading } = useQuery<{ invoices: Invoice[]; summary: any }>({
    queryKey: ["invoices", statusFilter, clientFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      if (statusFilter !== "all") p.set("status", statusFilter);
      if (clientFilter) p.set("clientId", clientFilter);
      return fetch(`/api/invoices?${p}`).then(r => r.json());
    },
  });

  const invoices = data?.invoices || [];
  const summary = data?.summary || { total: 0, draft: { count: 0, total: 0 }, pending: { count: 0, total: 0 }, paid: { count: 0, total: 0 }, overdue: { count: 0, total: 0 } };

  // Fetch work orders for create dialog
  const { data: woData } = useQuery({
    queryKey: ["workorders-create-invoice"],
    queryFn: () => fetch("/api/workorders?pageSize=100").then(r => r.json()),
    enabled: createOpen,
  });
  const workOrders = (woData?.rows as { id: string; ticketId: string; clientName: string; status: string }[]) || [];

  // Delete mutation
  const deleteMut = useMutation({
    mutationFn: async (id: string) => fetch(`/api/invoices/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); setDeleteId(null); setToast("Invoice deleted"); },
    onError: () => { setToast("Failed to delete invoice"); },
  });

  // Create mutation
  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderIds: createWos }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create invoice");
      }
      return res.json();
    },
    onSuccess: () => { setCreateOpen(false); setCreateWos([]); setSelectedFields({ ...DEFAULT_INVOICE_FIELDS }); qc.invalidateQueries({ queryKey: ["invoices"] }); setToast("Invoice created successfully"); },
    onError: (err) => { setToast(`Error: ${err.message}`); },
  });

  // Status badge colors
  const statusColors: Record<string, string> = {
    Draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    Paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    Overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const fmt = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (d: string | null) => {
    if (!d) return "\u2014";
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }); } catch { return d || "\u2014"; }
  };

  // If expanded view is active, show it instead of the list
  if (expandedId) {
    return (
      <ExpandedInvoiceView
        invoiceId={expandedId}
        onBack={() => {
          setExpandedId(null);
          qc.invalidateQueries({ queryKey: ["invoices"] });
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-16 right-4 z-50 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {toast}
          <button onClick={() => setToast(null)} className="ml-1 hover:opacity-70"><X className="h-3 w-3" /></button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <div className="h-6 w-1.5 rounded brand-gradient" />
          Invoices
        </h2>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Generate Invoice
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Invoices", value: fmt(summary.total), icon: DollarSign, color: "text-primary" },
          { label: "Pending", value: `${summary.pending?.count || 0} (${fmt(summary.pending?.total || 0)})`, icon: Clock, color: "text-yellow-600" },
          { label: "Paid", value: `${summary.paid?.count || 0} (${fmt(summary.paid?.total || 0)})`, icon: CheckCircle, color: "text-green-600" },
          { label: "Overdue", value: `${summary.overdue?.count || 0} (${fmt(summary.overdue?.total || 0)})`, icon: AlertTriangle, color: "text-red-600" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={cn("h-8 w-8 shrink-0", card.color)} />
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-sm font-semibold">{card.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="custom-scroll max-h-[calc(100vh-420px)] overflow-x-auto overflow-y-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3 sticky top-0 z-10 bg-muted">Invoice #</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3 sticky top-0 z-10 bg-muted">Client</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3 sticky top-0 z-10 bg-muted">Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3 sticky top-0 z-10 bg-muted">Engineer</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3 text-right sticky top-0 z-10 bg-muted">Total</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3 sticky top-0 z-10 bg-muted">Issue Date</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3 sticky top-0 z-10 bg-muted">Due Date</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3 w-28 sticky top-0 z-10 bg-muted">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : invoices.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No invoices found.</TableCell></TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-muted/30">
                    <TableCell className="px-3 py-2 text-sm font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell className="px-3 py-2 text-sm">{inv.clientName}</TableCell>
                    <TableCell className="px-3 py-2">
                      <Badge variant="secondary" className={cn("text-xs", statusColors[inv.status] || "")}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-sm">{inv.fieldEngineerName}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-right font-medium">{fmt(inv.total)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm">{fmtDate(inv.issueDate)}</TableCell>
                    <TableCell className="px-3 py-2 text-sm">{fmtDate(inv.dueDate)}</TableCell>
                    <TableCell className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewId(inv.id)} title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedId(inv.id)} title="Expand View">
                          <Maximize2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditId(inv.id)} title="Edit">
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(inv.id)} title="Delete">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* View Invoice Dialog (quick preview) */}
      {viewId && <InvoiceViewerDialog invoiceId={viewId} onClose={() => setViewId(null)} onExpand={() => { setViewId(null); setExpandedId(viewId); }} />}
      {editId && <InvoiceEditDialog invoiceId={editId} onClose={() => { setEditId(null); qc.invalidateQueries({ queryKey: ["invoices"] }); qc.invalidateQueries({ queryKey: ["invoice", editId] }); }} />}

      {/* Create Invoice Dialog */}
      <Dialog open={createOpen} onOpenChange={o => !o && setCreateOpen(false)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-3 border-b border-border shrink-0">
            <DialogTitle className="text-lg">Generate Invoice from Work Orders</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto custom-scroll px-6 py-4 space-y-5">
            <div>
              <p className="text-sm text-muted-foreground mb-3">Select work orders to include in the invoice. Line items will be auto-generated from the selected work orders.</p>
              <div className="max-h-52 overflow-y-auto custom-scroll border border-border rounded-md p-2">
                <div className="space-y-2">
                  {workOrders.map(wo => (
                    <label key={wo.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer border border-border">
                      <input
                        type="checkbox"
                        checked={createWos.includes(wo.id)}
                        onChange={e => {
                          if (e.target.checked) setCreateWos(prev => [...prev, wo.id]);
                          else setCreateWos(prev => prev.filter(id => id !== wo.id));
                        }}
                        className="rounded border-gray-300 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{wo.ticketId}</p>
                        <p className="text-xs text-muted-foreground truncate">{wo.clientName}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0 whitespace-nowrap">{wo.status}</Badge>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Invoice Fields Checkbox Selector */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Select Invoice Fields</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    const allChecked = INVOICE_FIELD_OPTIONS.every(f => selectedFields[f.key]);
                    const next = allChecked
                      ? INVOICE_FIELD_OPTIONS.reduce((a, f) => ({ ...a, [f.key]: false }), {} as Record<string, boolean>)
                      : { ...DEFAULT_INVOICE_FIELDS };
                    setSelectedFields(next);
                  }}
                >
                  {INVOICE_FIELD_OPTIONS.every(f => selectedFields[f.key]) ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="max-h-60 overflow-y-auto custom-scroll border border-border rounded-md p-3">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {INVOICE_FIELD_OPTIONS.map(field => (
                    <label key={field.key} className="flex items-center gap-2.5 cursor-pointer py-0.5">
                      <Checkbox
                        checked={selectedFields[field.key] ?? true}
                        onCheckedChange={(checked) =>
                          setSelectedFields(prev => ({ ...prev, [field.key]: !!checked }))
                        }
                        className="shrink-0"
                      />
                      <span className="text-sm whitespace-nowrap">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 pt-4 border-t border-border shrink-0">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || createWos.length === 0}
              className="min-w-[100px]"
            >
              {createMut.isPending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Generating...</> : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader><AlertDialogTitle>Delete Invoice</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => deleteId && deleteMut.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Invoice Quick-Preview Dialog ───────────────────────────────────────────────

function InvoiceViewerDialog({ invoiceId, onClose, onExpand }: { invoiceId: string; onClose: () => void; onExpand: () => void }) {
  const { data, isLoading } = useQuery<{ invoice: Invoice }>({
    queryKey: ["invoice", invoiceId],
    queryFn: () => fetch(`/api/invoices/${invoiceId}`).then(r => r.json()),
  });
  const inv = data?.invoice;
  let lineItems: LineItem[] = [];
  try { lineItems = inv?.lineItems ? JSON.parse(inv.lineItems) : []; } catch { lineItems = []; }

  const fmt = (v: number) => `$${v.toFixed(2)}`;

  const downloadPDF = async () => {
    const res = await fetch(`/api/invoices/pdf?invoiceId=${invoiceId}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${inv?.invoiceNumber || invoiceId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printInvoice = () => {
    const w = window.open("", "_blank");
    if (w) {
      fetch(`/api/invoices/pdf?invoiceId=${invoiceId}`)
        .then(r => r.text())
        .then(html => { w.document.write(html); w.document.close(); w.print(); });
    }
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice {inv?.invoiceNumber || ""}
            </span>
            {inv && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={onExpand} className="text-xs">
                  <Maximize2 className="h-3.5 w-3.5 mr-1" /> Expand
                </Button>
                <Button size="sm" variant="outline" onClick={printInvoice} className="text-xs">
                  <Printer className="h-3.5 w-3.5 mr-1" /> Print / PDF
                </Button>
                <Button size="sm" variant="outline" onClick={downloadPDF} className="text-xs">
                  <FileDown className="h-3.5 w-3.5 mr-1" /> Download
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : inv ? (
          <ScrollArea className="max-h-[70vh] custom-scroll">
            <div className="space-y-6 p-2">
              {/* Header with Logo Fixed */}
              <div className="flex items-start gap-4 mb-2">
                <Image src="/Techadox_Logo.png" alt="Techadox" width={120} height={56} className="h-14 w-auto rounded object-contain shrink-0" priority />
                <div>
                  <h3 className="font-bold text-lg">{inv.vendorName || COMPANY.name}</h3>
                  <p className="text-sm text-muted-foreground">{COMPANY.address}</p>
                  <p className="text-xs text-muted-foreground">{COMPANY.phone} | {COMPANY.email}</p>
                  {inv.vendorTaxId && <p className="text-xs text-muted-foreground">Tax ID: {inv.vendorTaxId}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div></div>
                <div className="text-right">
                  <h3 className="font-semibold">Bill To</h3>
                  <p className="text-sm">{inv.billToName || inv.clientName}</p>
                  {inv.billToAddress && <p className="text-xs text-muted-foreground">{inv.billToAddress}</p>}
                </div>
              </div>

              <div className="flex gap-4 text-sm">
                <span><strong>Platform:</strong> {inv.jobPlatformName}</span>
                <span><strong>Pay Rate:</strong> {inv.payRatePrimary} / {inv.payRateSecondary}</span>
                <span><strong>Engineer:</strong> {inv.fieldEngineerName}</span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((li, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{li.description}</TableCell>
                      <TableCell className="text-sm text-right">{li.quantity}</TableCell>
                      <TableCell className="text-sm text-right">{fmt(li.rate)}</TableCell>
                      <TableCell className="text-sm text-right font-medium">{fmt(li.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>{fmt(inv.subtotal)}</span></div>
                  <div className="flex justify-between"><span>Tax ({(inv.taxRate * 100).toFixed(0)}%)</span><span>{fmt(inv.tax)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{fmt(inv.total)}</span></div>
                </div>
              </div>

              {inv.notes && (
                <div className="bg-muted/50 rounded-md p-3 text-sm">
                  <strong>Notes:</strong> {inv.notes}
                </div>
              )}

              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Issued: {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : "\u2014"}</span>
                <span>Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "\u2014"}</span>
              </div>
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ─── Expanded Invoice Detail View (Full Page) ─────────────────────────────────

function ExpandedInvoiceView({ invoiceId, onBack }: { invoiceId: string; onBack: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => { if (toast) setTimeout(() => setToast(null), 3000); }, [toast]);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTaxRate, setEditTaxRate] = useState("0");
  const [editLineItems, setEditLineItems] = useState<LineItem[]>([]);
  const [editBillToName, setEditBillToName] = useState("");
  const [editBillToAddress, setEditBillToAddress] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Card");

  const { data, isLoading } = useQuery<{ invoice: Invoice }>({
    queryKey: ["invoice", invoiceId],
    queryFn: () => fetch(`/api/invoices/${invoiceId}`).then(r => r.json()),
  });

  const inv = data?.invoice;
  let lineItems: LineItem[] = [];
  try { lineItems = inv?.lineItems ? JSON.parse(inv.lineItems) : []; } catch { lineItems = []; }
  const payments = inv?.payments || [];

  const { data: woListData } = useQuery({
    queryKey: ["workorders-all"],
    queryFn: () => fetch("/api/workorders?pageSize=100").then(r => r.json()),
    staleTime: 60_000,
  });
  const workOrdersData = (woListData?.rows as { id: string; ticketId: string; clientName: string }[]) || [];

  const fmt = (v: number) => `$${Number(v).toFixed(2)}`;
  const fmtDate = (d: string | null) => {
    if (!d) return "\u2014";
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }); } catch { return d || "\u2014"; }
  };
  const fmtDateFull = (d: string | null) => {
    if (!d) return "\u2014";
    try { return new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "2-digit", year: "numeric" }); } catch { return d || "\u2014"; }
  };

  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    Draft: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-800 dark:text-gray-200", dot: "bg-gray-400" },
    Pending: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-800 dark:text-yellow-200", dot: "bg-yellow-500" },
    Paid: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-800 dark:text-green-200", dot: "bg-green-500" },
    Overdue: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-800 dark:text-red-200", dot: "bg-red-500" },
  };

  const startEditing = () => {
    if (!inv) return;
    setEditStatus(inv.status);
    setEditNotes(inv.notes);
    setEditTaxRate(String(inv.taxRate));
    setEditLineItems([...lineItems]);
    setEditBillToName(inv.billToName || "");
    setEditBillToAddress(inv.billToAddress || "");
    setEditDueDate(inv.dueDate ? inv.dueDate.split("T")[0] : "");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const sub = editLineItems.reduce((a, i) => a + i.amount, 0);
      const taxRate = parseFloat(editTaxRate) || 0;
      const tax = sub * taxRate;

      await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          notes: editNotes,
          taxRate,
          lineItems: editLineItems,
          billToName: editBillToName,
          billToAddress: editBillToAddress,
          dueDate: editDueDate ? new Date(editDueDate).toISOString() : null,
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      setIsEditing(false);
      setToast("Invoice updated successfully");
    },
  });

  const deleteMut = useMutation({
    mutationFn: async () => fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); onBack(); setToast("Invoice deleted"); },
  });

  const paymentMut = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(payAmount);
      if (!amount || amount <= 0) throw new Error("Invalid amount");
      await fetch("/api/accounts/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          amount,
          method: payMethod,
          status: "Completed",
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      setPaymentDialogOpen(false);
      setPayAmount("");
      setToast("Payment recorded successfully");
    },
  });

  const downloadPDF = async () => {
    const res = await fetch(`/api/invoices/pdf?invoiceId=${invoiceId}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${inv?.invoiceNumber || invoiceId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printInvoice = () => {
    const w = window.open("", "_blank");
    if (w) {
      fetch(`/api/invoices/pdf?invoiceId=${invoiceId}`)
        .then(r => r.text())
        .then(html => { w.document.write(html); w.document.close(); w.print(); });
    }
  };

  const copyInvoiceNumber = () => {
    if (inv) {
      navigator.clipboard.writeText(inv.invoiceNumber);
      setToast("Invoice number copied");
    }
  };

  const addLineItem = () => {
    setEditLineItems(prev => [...prev, { description: "", quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeLineItem = (idx: number) => {
    setEditLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateLineItem = (idx: number, field: keyof LineItem, value: string | number) => {
    setEditLineItems(prev => {
      const updated = [...prev];
      const item = { ...updated[idx] };

      if (field === "description") {
        item.description = value as string;
      } else if (field === "quantity" || field === "rate") {
        const numVal = typeof value === "string" ? parseFloat(value) || 0 : value;
        if (field === "quantity") item.quantity = numVal;
        else item.rate = numVal;
        item.amount = Number((item.quantity * item.rate).toFixed(2));
      }
      updated[idx] = item;
      return updated;
    });
  };

  const totalPaid = payments.filter(p => p.status === "Completed").reduce((a, p) => a + p.amount, 0);
  const balanceDue = (inv?.total || 0) - totalPaid;
  const poNumber = inv ? `PO-${inv.invoiceNumber.replace("INV-", "")}` : "—";
  const sc = statusConfig[inv?.status || "Draft"] || statusConfig.Draft;

  const canEdit = user?.permissions?.create_invoice;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading invoice details...</p>
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Invoice not found.</p>
        <Button variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Back to Invoices</Button>
      </div>
    );
  }

  const displayLineItems = isEditing ? editLineItems : lineItems;

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-16 right-4 z-50 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {toast}
          <button onClick={() => setToast(null)} className="ml-1 hover:opacity-70"><X className="h-3 w-3" /></button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Invoices
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && !isEditing && (
            <Button size="sm" variant="outline" onClick={startEditing}>
              <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          )}
          {isEditing && (
            <>
              <Button size="sm" variant="ghost" onClick={cancelEditing}>Cancel</Button>
              <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                {saveMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Save Changes
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={printInvoice}>
            <Printer className="h-3.5 w-3.5 mr-1" /> Print
          </Button>
          <Button size="sm" variant="outline" onClick={downloadPDF}>
            <Download className="h-3.5 w-3.5 mr-1" /> Download
          </Button>
          {canEdit && (
            <>
              <Button size="sm" variant="outline" onClick={() => setPaymentDialogOpen(true)}>
                <CreditCard className="h-3.5 w-3.5 mr-1" /> Record Payment
              </Button>
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Invoice Header Card with Fixed Logo Aspect Ratio */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex items-start gap-4 lg:w-1/2">
              <Image src="/Techadox_Logo.png" alt="Techadox" width={140} height={56} className="h-14 w-auto rounded-lg shrink-0 object-contain" priority />
              <div>
                <h3 className="text-xl font-bold">{inv.vendorName || COMPANY.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{COMPANY.address}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{COMPANY.phone} | {COMPANY.email}</p>
                {inv.vendorTaxId && <p className="text-xs text-muted-foreground mt-0.5">Tax ID: {inv.vendorTaxId}</p>}
              </div>
            </div>

            <div className="lg:w-1/2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold tracking-tight">INVOICE</h2>
                  <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium", sc.bg, sc.text)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
                    {inv.status}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyInvoiceNumber} title="Copy invoice number">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Invoice No.</p>
                  <p className="font-semibold">{inv.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Purchase Order</p>
                  <p className="font-semibold">{poNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Issue Date</p>
                  <p className="font-medium">{fmtDateFull(inv.issueDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Due Date</p>
                  {isEditing ? (
                    <Input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="h-7 text-sm mt-0.5" />
                  ) : (
                    <p className="font-medium">{fmtDateFull(inv.dueDate)}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Payment Terms</p>
                  <p className="font-medium">Net 30 Days</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Status</p>
                  {isEditing ? (
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger className="h-7 text-sm mt-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium">{inv.status}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Bill To
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isEditing ? (
              <div className="space-y-2">
                <Input value={editBillToName} onChange={e => setEditBillToName(e.target.value)} placeholder="Client name" className="h-8 text-sm" />
                <Textarea value={editBillToAddress} onChange={e => setEditBillToAddress(e.target.value)} placeholder="Address" className="text-sm min-h-[60px]" />
              </div>
            ) : (
              <div>
                <p className="font-semibold">{inv.billToName || inv.clientName}</p>
                {inv.billToAddress && <p className="text-sm text-muted-foreground mt-1">{inv.billToAddress}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
              Job Details
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform</span>
              <span className="font-medium">{inv.jobPlatformName || "—"}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pay Rate</span>
              <span className="font-medium">{inv.payRatePrimary || "—"}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pay Type</span>
              <span className="font-medium">{inv.payRateSecondary || "—"}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Work Orders</span>
              <span className="font-medium">
                {(() => {
                  try { return JSON.parse(inv.workOrderIds).length; } catch { return inv.workOrderIds.replace(/[\\[\]"]/g, "").split(",").filter(Boolean).length; }
                })()} linked
              </span>
            </div>
            {(() => {
              let ids: string[] = [];
              try { ids = JSON.parse(inv.workOrderIds); } catch { ids = inv.workOrderIds.replace(/[\[\]"]/g, "").split(",").filter(Boolean); }
              if (ids.length > 0) {
                return <div className="mt-2 space-y-0.5">{ids.map((id, i) => {
                  const wo = workOrdersData?.find(w => w.id === id);
                  return (
                    <div key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="font-medium text-foreground">{wo?.ticketId || id.slice(0, 8)}</span>
                      {wo?.clientName && <span>({wo.clientName})</span>}
                    </div>
                  );
                })}</div>;
              }
              return null;
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Field Engineer
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {inv.fieldEngineerName ? (
              <>
                <p className="font-semibold">{inv.fieldEngineerName}</p>
                <p className="text-sm text-muted-foreground mt-1">Assigned to work order</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Not assigned</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Line Items</CardTitle>
          {isEditing && (
            <Button size="sm" variant="outline" onClick={addLineItem} className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add Line
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="custom-scroll overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3 sticky top-0 z-10 bg-muted">Description</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3 text-right w-20 sticky top-0 z-10 bg-muted">Qty</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3 text-right w-28 sticky top-0 z-10 bg-muted">Rate</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3 text-right w-28 sticky top-0 z-10 bg-muted">Amount</TableHead>
                  {isEditing && <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3 w-10 sticky top-0 z-10 bg-muted"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayLineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isEditing ? 5 : 4} className="h-16 text-center text-muted-foreground text-sm">
                      {isEditing ? "Click 'Add Line' to add line items" : "No line items"}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayLineItems.map((li, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                      <TableCell className="px-3 py-2">
                        {isEditing ? (
                          <Input
                            value={li.description}
                            onChange={e => updateLineItem(i, "description", e.target.value)}
                            placeholder="Service description"
                            className="h-8 text-sm"
                          />
                        ) : (
                          <span className="text-sm">{li.description}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={li.quantity}
                            onChange={e => updateLineItem(i, "quantity", e.target.value)}
                            className="h-8 text-sm text-right ml-auto w-20"
                          />
                        ) : (
                          <span className="text-sm">{li.quantity}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={li.rate}
                            onChange={e => updateLineItem(i, "rate", e.target.value)}
                            className="h-8 text-sm text-right ml-auto w-28"
                          />
                        ) : (
                          <span className="text-sm">{fmt(li.rate)}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right">
                        <span className="text-sm font-medium">{fmt(li.amount)}</span>
                      </TableCell>
                      {isEditing && (
                        <TableCell className="px-3 py-2 text-center">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeLineItem(i)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end mt-4">
            <div className="w-72 space-y-1">
              {isEditing && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Tax Rate</span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={editTaxRate}
                        onChange={e => setEditTaxRate(e.target.value)}
                        className="h-7 text-sm text-right w-20"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                  <Separator className="my-1" />
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{fmt(inv.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({(inv.taxRate * 100).toFixed(1)}%)</span>
                <span className="font-medium">{fmt(inv.tax)}</span>
              </div>
              {payments.length > 0 && (
                <>
                  <Separator className="my-1" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Paid</span>
                    <span className="font-medium text-green-600">-{fmt(totalPaid)}</span>
                  </div>
                </>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between text-lg font-bold">
                <span>{payments.length > 0 ? "Balance Due" : "Total Due"}</span>
                <span>{fmt(payments.length > 0 ? balanceDue : inv.total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Notes &amp; Special Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isEditing ? (
              <Textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Add notes or special billing instructions..."
                className="text-sm min-h-[80px]"
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {inv.notes || "No notes. Default: Payment Terms — Net 30 days. Please remit payment via ACH or wire directly to Techadox. Thank you for your valued business partnership!"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Payment History
            </CardTitle>
            <Badge variant="secondary" className="text-xs">{payments.length} payment{payments.length !== 1 ? "s" : ""}</Badge>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No payments recorded yet.</p>
            ) : (
              <div className="custom-scroll max-h-48 overflow-auto space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{fmt(p.amount)}</p>
                        <p className="text-xs text-muted-foreground">{p.method} &middot; {fmtDate(p.createdAt)}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className={cn("text-xs", p.status === "Completed" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200")}>
                      {p.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Invoice Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Created</p>
              <p className="font-medium">{fmtDateFull(inv.createdAt || inv.issueDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Last Modified</p>
              <p className="font-medium">{fmtDateFull(inv.updatedAt || inv.issueDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Issued</p>
              <p className="font-medium">{fmtDateFull(inv.issueDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Due</p>
              <p className="font-medium">{fmtDateFull(inv.dueDate)}</p>
            </div>
            {inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== "Paid" && (
              <div>
                <Badge variant="destructive" className="text-xs">Overdue</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>Invoice {inv.invoiceNumber}</span>
            <span>&middot;</span>
            <span>{fmtDate(inv.issueDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={printInvoice}>
              <Printer className="h-3.5 w-3.5 mr-1" /> Print / PDF
            </Button>
            <Button size="sm" variant="outline" onClick={downloadPDF}>
              <Download className="h-3.5 w-3.5 mr-1" /> Download HTML
            </Button>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(window.location.href); setToast("Link copied"); }}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Invoice</Label>
              <p className="text-sm font-medium">{inv.invoiceNumber} — Balance: {fmt(balanceDue)}</p>
            </div>
            <div className="space-y-1">
              <Label>Payment Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Payment Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Card">Credit Card</SelectItem>
                  <SelectItem value="ACH">ACH Transfer</SelectItem>
                  <SelectItem value="Wire">Wire Transfer</SelectItem>
                  <SelectItem value="Check">Check</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => paymentMut.mutate()} disabled={paymentMut.isPending || !payAmount}>
              {paymentMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{inv.invoiceNumber}</strong>? This will also remove all associated payments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => deleteMut.mutate()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InvoiceEditDialog({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const { data, isLoading } = useQuery<{ invoice: Invoice }>({
    queryKey: ["invoice", invoiceId],
    queryFn: () => fetch(`/api/invoices/${invoiceId}`).then(r => r.json()),
  });
  const [form, setForm] = useState<Record<string, string>>({});

  const inv = data?.invoice;
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState("0");

  if (inv && status === "" && !form.id) {
    setStatus(inv.status);
    setNotes(inv.notes);
    setTaxRate(String(inv.taxRate));
    setForm({ id: inv.id });
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes, taxRate: parseFloat(taxRate) || 0 }),
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); qc.invalidateQueries({ queryKey: ["invoice", invoiceId] }); onClose(); showToast("Invoice updated successfully"); },
    onError: () => { showToast("Failed to update invoice"); },
  });

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Invoice</DialogTitle></DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : inv ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tax Rate (%)</Label>
              <Input type="number" step="0.1" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
