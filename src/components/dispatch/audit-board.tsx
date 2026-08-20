"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  STATUSES,
  PAY_RATE_TYPES_PRIMARY,
  PAY_RATE_TYPES_SECONDARY,
  ATTACHMENT_LIMITS,
  getAllowedExtensions,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  X,
  Save,
  Loader2,
  Upload,
  Trash2,
  MessageSquarePlus,
  FileText,
  Download,
  CheckCircle,
  Plus,
  Calculator,
} from "lucide-react";
import { TaskIdsInput } from "@/components/shared/task-ids-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AuditBoardProps {
  workOrderId: string;
  onClose: () => void;
  onSaved: () => void;
}

interface Note {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  order: number;
  filePath: string;
}

interface WorkOrderFull {
  id: string;
  ticketId: string;
  clientId: string | null;
  clientName: string;
  jobPlatformId: string | null;
  jobPlatformName: string;
  status: string;
  customerReferences: string;
  siteLocation: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  pickupSiteNotes: string;
  deliverySiteNotes: string;
  etaDlaDate: string | null;
  salesOrder: string;
  taskNumber: string;
  taskIds?: string; // JSON array
  serialNumber: string;
  toxCode: string;
  payRatePrimary: string;
  payRateSecondary: string;
  fieldEngineerId: string | null;
  fieldEngineerName: string;
  engineerPhone: string;
  engineerContactAlt: string;
  engineerEmail: string;
  workedStartTime: string | null;
  workedEndTime: string | null;
  hours: number;
  authorizedExpenses: number;
  expenses: number;
  incurredExpenses: number;
  hourlyRate: number;
  billRate: number;
  flatRate: number;
  editManually: boolean;
  approveStatusSigner: string;
  comments: string;
  notes: string;
  dateCreated: string;
  dateModified: string;
  attachments: Attachment[];
  client?: { id: string; name: string; address?: string; contactName?: string; contactEmail?: string };
  fieldEngineer?: { id: string; name: string; email?: string; phone?: string };
}

export function AuditBoard({ workOrderId, onClose, onSaved }: AuditBoardProps) {
  const qc = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);

  // Toast state
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch work order
  const { data, isLoading } = useQuery<{ workOrder: WorkOrderFull }>({
    queryKey: ["workorder", workOrderId],
    queryFn: () => fetch(`/api/workorders/${workOrderId}`).then(r => r.json()),
    enabled: !!workOrderId,
  });

  const wo = data?.workOrder;

  // Edit state
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [deleteAttId, setDeleteAttId] = useState<string | null>(null);
  const [viewAttId, setViewAttId] = useState<string | null>(null);
  const [taskIds, setTaskIds] = useState<string[]>([]);

  // Manual edit & calculator
  const [editManually, setEditManually] = useState(false);
  const [manualPay, setManualPay] = useState("");
  const [manualBill, setManualBill] = useState("");

  // Add New dialogs
  const [addNewDialog, setAddNewDialog] = useState<"client" | "platform" | "engineer" | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newPlatformName, setNewPlatformName] = useState("");
  const [newEngineerName, setNewEngineerName] = useState("");
  const [newEngineerEmail, setNewEngineerEmail] = useState("");
  const [newEngineerPhone, setNewEngineerPhone] = useState("");

  // Fetch lookups
  const { data: clientsData } = useQuery({ queryKey: ["clients"], queryFn: () => fetch("/api/clients").then(r => r.json()) });
  const { data: engineersData } = useQuery({ queryKey: ["engineers"], queryFn: () => fetch("/api/engineers").then(r => r.json()) });
  const { data: platformsData } = useQuery({ queryKey: ["platforms"], queryFn: () => fetch("/api/platforms").then(r => r.json()) });

  const clients = (clientsData?.clients as { id: string; name: string }[]) || [];
  const engineers = (engineersData?.engineers as { id: string; name: string; email?: string; phone?: string }[]) || [];
  const platforms = (platformsData?.platforms as { id: string; name: string }[]) || [];

  // Sync form when wo loads
  useEffect(() => {
    if (wo) {
      const newForm: Record<string, unknown> = {
        ticketId: wo.ticketId,
        clientId: wo.clientId || "",
        clientName: wo.clientName,
        jobPlatformId: wo.jobPlatformId || "",
        jobPlatformName: wo.jobPlatformName,
        status: wo.status,
        streetAddress: wo.streetAddress || "",
        city: wo.city || "",
        state: wo.state || "",
        zipCode: wo.zipCode || "",
        country: wo.country || "USA",
        pickupSiteNotes: wo.pickupSiteNotes || "",
        deliverySiteNotes: wo.deliverySiteNotes || "",
        etaDlaDate: wo.etaDlaDate ? new Date(wo.etaDlaDate).toISOString().slice(0, 16) : "",
        salesOrder: wo.salesOrder || "",
        taskNumber: wo.taskNumber || "",
        serialNumber: wo.serialNumber || "",
        toxCode: wo.toxCode || "",
        payRatePrimary: wo.payRatePrimary || "",
        payRateSecondary: wo.payRateSecondary || "",
        fieldEngineerId: wo.fieldEngineerId || "",
        fieldEngineerName: wo.fieldEngineerName,
        engineerPhone: wo.engineerPhone || "",
        engineerContactAlt: wo.engineerContactAlt || "",
        engineerEmail: wo.engineerEmail || "",
        workedStartTime: wo.workedStartTime ? new Date(wo.workedStartTime).toISOString().slice(0, 16) : "",
        workedEndTime: wo.workedEndTime ? new Date(wo.workedEndTime).toISOString().slice(0, 16) : "",
        hours: wo.hours,
        authorizedExpenses: wo.authorizedExpenses,
        expenses: wo.expenses,
        incurredExpenses: wo.incurredExpenses,
        hourlyRate: wo.hourlyRate,
        billRate: wo.billRate,
        flatRate: wo.flatRate,
        approveStatusSigner: wo.approveStatusSigner || "",
        comments: wo.comments,
      };
      queueMicrotask(() => {
        setForm(newForm);
        setEditManually(Boolean(wo.editManually));
        try { setNotes(typeof wo.notes === "string" ? JSON.parse(wo.notes) : []); } catch { /* keep existing */ }
        // Load task IDs from existing work order
        if (wo.taskIds) {
          try {
            const parsed = JSON.parse(wo.taskIds);
            if (Array.isArray(parsed)) {
              setTaskIds(parsed);
            }
          } catch {
            setTaskIds([]);
          }
        } else {
          setTaskIds([]);
        }
      });
    }
  }, [wo]);

  // Calculator values (derived)
  const hoursNum = Number(form.hours) || 0;
  const hourlyRateNum = Number(form.hourlyRate) || 0;
  const billRateNum = Number(form.billRate) || 0;
  const calculatedPay = hourlyRateNum * hoursNum;
  const calculatedBill = billRateNum * hoursNum;

  const updateForm = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));

  // Auto-calculate hours from start/end time
  const autoCalcHours = useCallback((startTime: string, endTime: string) => {
    if (!editManually && startTime && endTime) {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
        const diffHrs = (end - start) / 3600000;
        updateForm("hours", parseFloat(diffHrs.toFixed(2)));
      }
    }
  }, [editManually]);

  const handleStartTimeChange = (val: string) => {
    updateForm("workedStartTime", val);
    autoCalcHours(val, String(form.workedEndTime || ""));
  };
  const handleEndTimeChange = (val: string) => {
    updateForm("workedEndTime", val);
    autoCalcHours(String(form.workedStartTime || ""), val);
  };

  const handleEngineerChange = (engId: string) => {
    updateForm("fieldEngineerId", engId);
    const eng = engineers.find(e => e.id === engId);
    if (eng) {
      updateForm("fieldEngineerName", eng.name);
      if (eng.phone) updateForm("engineerPhone", eng.phone);
      if (eng.email) updateForm("engineerEmail", eng.email);
    }
  };

  // Add New mutations
  const addClientMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newClientName }) });
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      updateForm("clientId", data.client.id);
      updateForm("clientName", data.client.name);
      setAddNewDialog(null);
      setNewClientName("");
      showToast("Client added successfully");
    },
    onError: () => { showToast("Failed to add client"); },
  });

  const addPlatformMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/platforms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newPlatformName }) });
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["platforms"] });
      updateForm("jobPlatformId", data.platform.id);
      updateForm("jobPlatformName", data.platform.name);
      setAddNewDialog(null);
      setNewPlatformName("");
      showToast("Platform added successfully");
    },
    onError: () => { showToast("Failed to add platform"); },
  });

  const addEngineerMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/engineers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newEngineerName, email: newEngineerEmail, phone: newEngineerPhone }) });
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["engineers"] });
      updateForm("fieldEngineerId", data.engineer.id);
      updateForm("fieldEngineerName", data.engineer.name);
      setAddNewDialog(null);
      setNewEngineerName("");
      setNewEngineerEmail("");
      setNewEngineerPhone("");
      showToast("Engineer added successfully");
    },
    onError: () => { showToast("Failed to add engineer"); },
  });

  // Save mutation
  const saveMut = useMutation({
    mutationFn: async () => {
      const customerRefs = [form.salesOrder, form.taskNumber, form.serialNumber, form.toxCode]
        .filter(Boolean).join(" | ");
      const siteLoc = [form.streetAddress, form.city, form.state, form.zipCode]
        .filter(Boolean).join(", ");

      const allowedFields = [
        "ticketId", "clientId", "clientName", "jobPlatformId", "jobPlatformName",
        "status", "customerReferences", "siteLocation", "payRatePrimary", "payRateSecondary",
        "fieldEngineerId", "fieldEngineerName", "hours", "expenses", "incurredExpenses",
        "hourlyRate", "comments", "notes",
        "streetAddress", "city", "state", "zipCode", "country",
        "pickupSiteNotes", "deliverySiteNotes", "etaDlaDate",
        "salesOrder", "taskNumber", "serialNumber", "toxCode",
        "engineerPhone", "engineerContactAlt", "engineerEmail",
        "workedStartTime", "workedEndTime",
        "authorizedExpenses", "billRate", "editManually", "approveStatusSigner",
      ];

      const payload: Record<string, unknown> = {
        customerReferences: customerRefs,
        siteLocation: siteLoc,
        editManually,
        taskIds: taskIds.length > 0 ? JSON.stringify(taskIds) : null,
      };

      for (const key of allowedFields) {
        if (key in form) {
          payload[key] = form[key];
        }
      }

      const res = await fetch(`/api/workorders/${workOrderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workorder", workOrderId] }); onSaved(); showToast("Ticket saved successfully"); },
    onError: (err: Error) => { showToast(`Error: ${err.message}`); },
  });

  // Add note mutation
  const noteMut = useMutation({
    mutationFn: async () => {
      if (!newNote.trim()) return;
      await fetch(`/api/workorders/${workOrderId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newNote.trim() }),
      });
    },
    onSuccess: () => {
      setNewNote("");
      qc.invalidateQueries({ queryKey: ["workorder", workOrderId] });
      showToast("Note added successfully");
    },
    onError: () => { showToast("Failed to add note"); },
  });

  // Delete attachment
  const deleteAttMut = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      setDeleteAttId(null);
      qc.invalidateQueries({ queryKey: ["workorder", workOrderId] });
      showToast("Attachment deleted");
    },
    onError: () => { showToast("Failed to delete attachment"); },
  });

  // Upload attachment mutation
  const uploadMut = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      formData.append("workOrderId", workOrderId);
      for (const file of files) formData.append("files", file);
      const res = await fetch("/api/attachments", { method: "POST", body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ["workorder", workOrderId] }); 
      showToast("Attachment uploaded successfully"); 
    },
    onError: (err: Error) => { showToast(`Upload error: ${err.message}`); },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      uploadMut.mutate(files);
    }
    // Reset file input target value so the same file can be selected again if needed
    e.target.value = "";
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return d; }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  const isImage = (type: string) => type.startsWith("image/");
  const viewAtt = wo?.attachments.find(a => a.id === viewAttId);

  return (
    <>
      {toast && (
        <div className="fixed top-16 right-4 z-[60] bg-primary text-primary-foreground px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {toast}
          <button onClick={() => setToast(null)} className="ml-1 hover:opacity-70"><X className="h-3 w-3" /></button>
        </div>
      )}

      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div
          ref={panelRef}
          className="relative w-full max-w-2xl bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div>
              <h3 className="font-semibold text-sm">Edit Ticket</h3>
              <p className="text-xs text-muted-foreground">{wo?.ticketId}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                {saveMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : wo ? (
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll">
              <div className="p-4 space-y-4">

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={String(form.status)} onValueChange={v => updateForm("status", v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <ScrollArea className="max-h-[240px]">
                        {STATUSES.map(s => (
                          <SelectItem key={s.key} value={s.key}>
                            <span className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-sm inline-block border border-black/10" style={{ backgroundColor: s.bg }} />
                              {s.label}
                            </span>
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identification</h4>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Ticket ID</Label>
                    <Input value={String(form.ticketId || "")} onChange={e => updateForm("ticketId", e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Client</Label>
                    <Select value={String(form.clientId || "")} onValueChange={v => {
                      updateForm("clientId", v);
                      updateForm("clientName", clients.find(c => c.id === v)?.name || "");
                    }}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        <ScrollArea className="max-h-[240px]">
                          {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </ScrollArea>
                        <div className="border-t mt-1 pt-1">
                          <button type="button" className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-primary hover:bg-primary/10 rounded-sm cursor-pointer" onClick={() => { setAddNewDialog("client"); setNewClientName(""); }}>
                            <Plus className="h-3 w-3" /> Add New Client
                          </button>
                        </div>
                      </SelectContent>
                    </Select>
                    {wo.client?.address && <p className="text-[11px] text-muted-foreground">{wo.client.address}</p>}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer &amp; Order References</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Sales Order (SO)</Label>
                      <Input value={String(form.salesOrder || "")} onChange={e => updateForm("salesOrder", e.target.value)} placeholder="e.g. SCD-1002" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Task Number</Label>
                      <Input value={String(form.taskNumber || "")} onChange={e => updateForm("taskNumber", e.target.value)} placeholder="e.g. TSK-190" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Serial #</Label>
                      <Input value={String(form.serialNumber || "")} onChange={e => updateForm("serialNumber", e.target.value)} placeholder="e.g. SN-98231" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">TOX Code</Label>
                      <Input value={String(form.toxCode || "")} onChange={e => updateForm("toxCode", e.target.value)} placeholder="e.g. TOX-682" className="h-9" />
                    </div>
                  </div>

                  {/* NEW: Task IDs Component */}
                  <div className="col-span-full">
                    {!isLoading ? (
                      <TaskIdsInput
                        taskIds={taskIds}
                        onTaskIdsChange={setTaskIds}
                        label="Task IDs (Multiple Tasks)"
                        description="Add 1-40 task IDs for Geodis requests and complex work orders"
                        placeholder="Enter task ID (e.g., TASK-001)"
                        showCounter={true}
                        maxTasks={40}
                        disabled={saveMut.isPending}
                      />
                    ) : null}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Site Coordinates &amp; Location</h4>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Street Address</Label>
                    <Input value={String(form.streetAddress || "")} onChange={e => updateForm("streetAddress", e.target.value)} placeholder="e.g. 100 Corporate Plaza" className="h-9" />
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">City</Label>
                      <Input value={String(form.city || "")} onChange={e => updateForm("city", e.target.value)} placeholder="Dallas" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">State</Label>
                      <Input value={String(form.state || "")} onChange={e => updateForm("state", e.target.value)} placeholder="TX" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Zip Code</Label>
                      <Input value={String(form.zipCode || "")} onChange={e => updateForm("zipCode", e.target.value)} placeholder="75201" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Country</Label>
                      <Input value={String(form.country || "USA")} onChange={e => updateForm("country", e.target.value)} placeholder="USA" className="h-9" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">ETA / DLA Date &amp; Time</Label>
                    <Input type="datetime-local" value={String(form.etaDlaDate || "")} onChange={e => updateForm("etaDlaDate", e.target.value)} className="h-9" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Pickup Site / Notes</Label>
                      <Input value={String(form.pickupSiteNotes || "")} onChange={e => updateForm("pickupSiteNotes", e.target.value)} placeholder="Pickup warehouse/address" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Delivery Site / Notes</Label>
                      <Input value={String(form.deliverySiteNotes || "")} onChange={e => updateForm("deliverySiteNotes", e.target.value)} placeholder="Delivery terminal/address" className="h-9" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assignment &amp; Status</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Job Platform</Label>
                      <Select value={String(form.jobPlatformId || "")} onValueChange={v => {
                        updateForm("jobPlatformId", v);
                        updateForm("jobPlatformName", platforms.find(p => p.id === v)?.name || "");
                      }}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent className="max-h-64">
                          <ScrollArea className="max-h-[240px]">
                            {platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </ScrollArea>
                          <div className="border-t mt-1 pt-1">
                            <button type="button" className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-primary hover:bg-primary/10 rounded-sm cursor-pointer" onClick={() => { setAddNewDialog("platform"); setNewPlatformName(""); }}>
                              <Plus className="h-3 w-3" /> Add New Platform
                            </button>
                          </div>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Field Engineer</Label>
                      <Select value={String(form.fieldEngineerId || "")} onValueChange={handleEngineerChange}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent className="max-h-64">
                          <ScrollArea className="max-h-[240px]">
                            {engineers.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                          </ScrollArea>
                          <div className="border-t mt-1 pt-1">
                            <button type="button" className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-primary hover:bg-primary/10 rounded-sm cursor-pointer" onClick={() => { setAddNewDialog("engineer"); setNewEngineerName(""); setNewEngineerEmail(""); setNewEngineerPhone(""); }}>
                              <Plus className="h-3 w-3" /> Add New Engineer
                            </button>
                          </div>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Engineer Phone</Label>
                      <Input value={String(form.engineerPhone || "")} onChange={e => updateForm("engineerPhone", e.target.value)} placeholder="e.g. 512-555-8100" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">FE Contact #</Label>
                      <Input value={String(form.engineerContactAlt || "")} onChange={e => updateForm("engineerContactAlt", e.target.value)} placeholder="FE Direct Contact" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Engineer Email</Label>
                      <Input type="email" value={String(form.engineerEmail || "")} onChange={e => updateForm("engineerEmail", e.target.value)} placeholder="engineer@tdxtech.com" className="h-9" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time Tracking</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Worked Start Time</Label>
                      <Input type="datetime-local" value={String(form.workedStartTime || "")} onChange={e => handleStartTimeChange(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Worked End Time</Label>
                      <Input type="datetime-local" value={String(form.workedEndTime || "")} onChange={e => handleEndTimeChange(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Hours</Label>
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        value={String(form.hours ?? "")}
                        onChange={e => updateForm("hours", parseFloat(e.target.value) || 0)}
                        className={cn("h-9", !editManually && "bg-muted")}
                        disabled={!editManually}
                      />
                      {!editManually && <p className="text-[11px] text-muted-foreground">Auto-calculated from start/end time</p>}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pay Rates</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Pay Rate (Primary)</Label>
                      <Select value={String(form.payRatePrimary || "")} onValueChange={v => updateForm("payRatePrimary", v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent className="max-h-64">
                          <ScrollArea className="max-h-[240px]">
                            {PAY_RATE_TYPES_PRIMARY.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Pay Rate (Secondary)</Label>
                      <Select value={String(form.payRateSecondary || "")} onValueChange={v => updateForm("payRateSecondary", v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent className="max-h-64">
                          <ScrollArea className="max-h-[240px]">
                            {PAY_RATE_TYPES_SECONDARY.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financials</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Hourly Rate ($)</Label>
                      <Input type="number" step="0.01" min="0" value={String(form.hourlyRate ?? "")} onChange={e => updateForm("hourlyRate", parseFloat(e.target.value) || 0)} placeholder="0.00" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Bill Rate ($)</Label>
                      <Input type="number" step="0.01" min="0" value={String(form.billRate ?? "")} onChange={e => updateForm("billRate", parseFloat(e.target.value) || 0)} placeholder="0.00" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Flat Rate ($)</Label>
                      <Input type="number" step="0.01" min="0" value={String(form.flatRate ?? "")} onChange={e => updateForm("flatRate", parseFloat(e.target.value) || 0)} placeholder="0.00" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Authorized Expenses ($)</Label>
                      <Input type="number" step="0.01" min="0" value={String(form.authorizedExpenses ?? "")} onChange={e => updateForm("authorizedExpenses", parseFloat(e.target.value) || 0)} placeholder="0.00" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Expenses ($)</Label>
                      <Input type="number" step="0.01" min="0" value={String(form.expenses ?? "")} onChange={e => updateForm("expenses", parseFloat(e.target.value) || 0)} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Incurred Expenses ($)</Label>
                      <Input type="number" step="0.01" min="0" value={String(form.incurredExpenses ?? "")} onChange={e => updateForm("incurredExpenses", parseFloat(e.target.value) || 0)} className="h-9" />
                    </div>
                    <div className="space-y-1 sm:col-span-3">
                      <Label className="text-xs text-muted-foreground">Approve Status / Signer</Label>
                      <Input value={String(form.approveStatusSigner || "")} onChange={e => updateForm("approveStatusSigner", e.target.value)} placeholder="e.g. Yes - Approved by Mark" className="h-9" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Calculator className="h-3.5 w-3.5" />
                      Automated Rate Calculator
                    </h4>
                    <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setEditManually(!editManually)}>
                      <Checkbox checked={editManually} onCheckedChange={(v) => setEditManually(v === true)} />
                      <span className="text-xs text-muted-foreground">Edit Manually</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/50 border">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Hours</p>
                      {editManually ? (
                        <Input type="number" step="0.25" min="0" value={String(form.hours ?? "")} onChange={e => updateForm("hours", parseFloat(e.target.value) || 0)} className="h-9" />
                      ) : (
                        <p className="text-lg font-semibold">{hoursNum.toFixed(1)} hrs</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Calculated Pay</p>
                      {editManually ? (
                        <Input type="number" step="0.01" min="0" value={manualPay || calculatedPay.toFixed(2)} onChange={e => setManualPay(e.target.value)} className="h-9" placeholder="0.00" />
                      ) : (
                        <p className="text-lg font-semibold text-primary">${calculatedPay.toFixed(2)}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">Paid @ ${hourlyRateNum.toFixed(2)}/hr</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Calculated Bill</p>
                      {editManually ? (
                        <Input type="number" step="0.01" min="0" value={manualBill || calculatedBill.toFixed(2)} onChange={e => setManualBill(e.target.value)} className="h-9" placeholder="0.00" />
                      ) : (
                        <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">${calculatedBill.toFixed(2)}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">Billed @ ${billRateNum.toFixed(2)}/hr</p>
                    </div>
                  </div>
                  {editManually && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      Manual override active — values will be used as-is instead of auto-calculated.
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comments / Requirements</Label>
                  <Textarea value={String(form.comments || "")} onChange={e => updateForm("comments", e.target.value)} rows={3} className="text-sm" placeholder="Log dispatch constraints, scope of work, etc." />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div><span>Created: </span>{formatDate(wo.dateCreated)}</div>
                  <div><span>Modified: </span>{formatDate(wo.dateModified)}</div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    Quick Notes
                  </Label>
                  <div className="space-y-1 max-h-48 overflow-y-auto custom-scroll">
                    {notes.length === 0 && <p className="text-xs text-muted-foreground italic">No notes yet.</p>}
                    {[...notes].reverse().map((note) => (
                      <div key={note.id} className="bg-muted/50 rounded-md p-2 text-xs space-y-0.5">
                        <p className="font-medium">{note.author}</p>
                        <p className="text-muted-foreground">{note.text}</p>
                        <p className="text-muted-foreground text-[10px]">{formatDate(note.timestamp)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      className="h-8 text-xs"
                      onKeyDown={e => e.key === "Enter" && noteMut.mutate()}
                    />
                    <Button size="sm" variant="outline" onClick={() => noteMut.mutate()} disabled={noteMut.isPending || !newNote.trim()}>
                      {noteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Upload className="h-3.5 w-3.5" />
                    Attachments ({wo.attachments?.length || 0}/{ATTACHMENT_LIMITS.maxFiles})
                  </Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" asChild>
                      <label className="cursor-pointer">
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        Upload Files
                        <input type="file" multiple className="hidden" accept={getAllowedExtensions().join(",")} onChange={handleFileSelect} />
                      </label>
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Max {ATTACHMENT_LIMITS.maxFileSizeMB}MB each. Supported: {getAllowedExtensions().join(", ")}
                    </span>
                    {uploadMut.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                  {wo.attachments && wo.attachments.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {wo.attachments.map(att => (
                        <div key={att.id} className="group relative border border-border rounded-md overflow-hidden bg-muted/30 aspect-square flex items-center justify-center cursor-pointer" onClick={() => setViewAttId(att.id)}>
                          {isImage(att.fileType) ? (
                            <img src={`/api/attachments/${att.id}`} alt={att.fileName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center p-1">
                              <FileText className="h-6 w-6 mx-auto text-muted-foreground" />
                              <p className="text-[9px] truncate max-w-full">{att.fileName}</p>
                              <p className="text-[9px] text-muted-foreground">{formatSize(att.fileSize)}</p>
                            </div>
                          )}
                          <button
                            className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={e => { e.stopPropagation(); setDeleteAttId(att.id); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          ) : null}
        </div>
      </div>

      <AlertDialog open={!!deleteAttId} onOpenChange={o => !o && setDeleteAttId(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => deleteAttId && deleteAttMut.mutate(deleteAttId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!viewAttId} onOpenChange={o => !o && setViewAttId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewAtt?.fileName}</DialogTitle>
          </DialogHeader>
          {viewAtt && (
            <div className="flex flex-col items-center gap-4">
              {isImage(viewAtt.fileType) ? (
                <img src={`/api/attachments/${viewAtt.id}`} alt={viewAtt.fileName} className="max-h-[60vh] max-w-full object-contain rounded border" />
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">{viewAtt.fileName}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(viewAtt.fileSize)}</p>
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <a href={`/api/attachments/${viewAtt.id}`} download>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addNewDialog === "client"} onOpenChange={o => !o && setAddNewDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Client Name</Label>
              <Input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="e.g. AstraZeneca" autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNewDialog(null)}>Cancel</Button>
            <Button onClick={() => addClientMut.mutate()} disabled={!newClientName.trim() || addClientMut.isPending}>
              {addClientMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Add Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addNewDialog === "platform"} onOpenChange={o => !o && setAddNewDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add New Job Platform</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Platform Name</Label>
              <Input value={newPlatformName} onChange={e => setNewPlatformName(e.target.value)} placeholder="e.g. FieldNation" autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNewDialog(null)}>Cancel</Button>
            <Button onClick={() => addPlatformMut.mutate()} disabled={!newPlatformName.trim() || addPlatformMut.isPending}>
              {addPlatformMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Add Platform
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addNewDialog === "engineer"} onOpenChange={o => !o && setAddNewDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add New Field Engineer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={newEngineerName} onChange={e => setNewEngineerName(e.target.value)} placeholder="e.g. John Smith" autoFocus />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={newEngineerEmail} onChange={e => setNewEngineerEmail(e.target.value)} placeholder="engineer@tdxtech.com" />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={newEngineerPhone} onChange={e => setNewEngineerPhone(e.target.value)} placeholder="512-555-8100" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNewDialog(null)}>Cancel</Button>
            <Button onClick={() => addEngineerMut.mutate()} disabled={!newEngineerName.trim() || addEngineerMut.isPending}>
              {addEngineerMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Add Engineer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
