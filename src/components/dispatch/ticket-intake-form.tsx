"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { STATUSES, PAY_RATE_TYPES_PRIMARY, PAY_RATE_TYPES_SECONDARY, ATTACHMENT_LIMITS, getAllowedExtensions } from "@/lib/constants";
import { Loader2, Upload, X, Paperclip, Calculator, Plus, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TicketIntakeFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function TicketIntakeForm({ open, onClose, onSubmit }: TicketIntakeFormProps) {
  // Toast state
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Form state — identification
  const [ticketId, setTicketId] = useState(`TA-${Date.now()}`);
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");

  // Assignment & Status
  const [jobPlatformId, setJobPlatformId] = useState("");
  const [jobPlatformName, setJobPlatformName] = useState("");
  const [status, setStatus] = useState("open-pending");
  const [fieldEngineerId, setFieldEngineerId] = useState("");
  const [fieldEngineerName, setFieldEngineerName] = useState("");
  const [engineerPhone, setEngineerPhone] = useState("");
  const [engineerContactAlt, setEngineerContactAlt] = useState("");
  const [engineerEmail, setEngineerEmail] = useState("");

  // Customer & Order References
  const [salesOrder, setSalesOrder] = useState("");
  const [taskNumber, setTaskNumber] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [toxCode, setToxCode] = useState("");

  // Site Coordinates & Location
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("USA");
  const [pickupSiteNotes, setPickupSiteNotes] = useState("");
  const [deliverySiteNotes, setDeliverySiteNotes] = useState("");
  const [etaDlaDate, setEtaDlaDate] = useState("");

  // Time Tracking
  const [workedStartTime, setWorkedStartTime] = useState("");
  const [workedEndTime, setWorkedEndTime] = useState("");
  const [hours, setHours] = useState("");
  const [editManually, setEditManually] = useState(false);
  const [manualPay, setManualPay] = useState("");
  const [manualBill, setManualBill] = useState("");

  // Pay Rates
  const [payRatePrimary, setPayRatePrimary] = useState("");
  const [payRateSecondary, setPayRateSecondary] = useState("");

  // Financials
  const [hourlyRate, setHourlyRate] = useState("");
  const [authorizedExpenses, setAuthorizedExpenses] = useState("");
  const [expenses, setExpenses] = useState("");
  const [incurredExpenses, setIncurredExpenses] = useState("");
  const [billRate, setBillRate] = useState("");
  const [flatRate, setFlatRate] = useState("");
  const [approveStatusSigner, setApproveStatusSigner] = useState("");

  // Comments & Attachments
  const [comments, setComments] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<File[]>([]);

  // Add New dialogs
  const [addNewDialog, setAddNewDialog] = useState<"client" | "platform" | "engineer" | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newPlatformName, setNewPlatformName] = useState("");
  const [newEngineerName, setNewEngineerName] = useState("");
  const [newEngineerEmail, setNewEngineerEmail] = useState("");
  const [newEngineerPhone, setNewEngineerPhone] = useState("");
  const qc = useQueryClient();

  // Fetch lookups
  const { data: clientsData } = useQuery({ queryKey: ["clients"], queryFn: () => fetch("/api/clients").then(r => r.json()) });
  const { data: engineersData } = useQuery({ queryKey: ["engineers"], queryFn: () => fetch("/api/engineers").then(r => r.json()) });
  const { data: platformsData } = useQuery({ queryKey: ["platforms"], queryFn: () => fetch("/api/platforms").then(r => r.json()) });

  const clients = (clientsData?.clients as { id: string; name: string }[]) || [];
  const engineers = (engineersData?.engineers as { id: string; name: string; email?: string; phone?: string }[]) || [];
  const platforms = (platformsData?.platforms as { id: string; name: string }[]) || [];

  // Auto-calculate hours from start/end time
  const hoursNum = parseFloat(hours) || 0;
  const hourlyRateNum = parseFloat(hourlyRate) || 0;
  const billRateNum = parseFloat(billRate) || 0;
  const calculatedPay = hourlyRateNum * hoursNum;
  const calculatedBill = billRateNum * hoursNum;

  useEffect(() => {
    if (!editManually && workedStartTime && workedEndTime) {
      const start = new Date(workedStartTime).getTime();
      const end = new Date(workedEndTime).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
        const diffHrs = (end - start) / 3600000;
        setHours(diffHrs.toFixed(2));
      }
    }
  }, [workedStartTime, workedEndTime, editManually]);

  // Populate engineer contact when engineer is selected
  useEffect(() => {
    if (fieldEngineerId) {
      const eng = engineers.find(e => e.id === fieldEngineerId);
      if (eng) {
        if (eng.phone && !engineerPhone) setEngineerPhone(eng.phone);
        if (eng.email && !engineerEmail) setEngineerEmail(eng.email || "");
      }
    }
  }, [fieldEngineerId, engineers, engineerPhone, engineerEmail]);

  // Add New mutations
  const addClientMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newClientName }) });
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setClientId(data.client.id);
      setClientName(data.client.name);
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
      setJobPlatformId(data.platform.id);
      setJobPlatformName(data.platform.name);
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
      setFieldEngineerId(data.engineer.id);
      setFieldEngineerName(data.engineer.name);
      setAddNewDialog(null);
      setNewEngineerName("");
      setNewEngineerEmail("");
      setNewEngineerPhone("");
      showToast("Engineer added successfully");
    },
    onError: () => { showToast("Failed to add engineer"); },
  });

  // Submit mutation
  const submitMut = useMutation({
    mutationFn: async () => {
      const errs: Record<string, string> = {};
      if (!clientName) errs.clientName = "Client is required";
      if (!jobPlatformName) errs.jobPlatform = "Job Platform is required";
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        throw new Error("Validation failed");
      }

      const res = await fetch("/api/workorders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          clientId: clientId || null,
          clientName,
          jobPlatformId: jobPlatformId || null,
          jobPlatformName,
          status,
          customerReferences: [salesOrder, taskNumber, serialNumber, toxCode].filter(Boolean).join(" | "),
          siteLocation: [streetAddress, city, state, zipCode].filter(Boolean).join(", "),
          streetAddress,
          city,
          state,
          zipCode,
          country: country || "USA",
          pickupSiteNotes,
          deliverySiteNotes,
          etaDlaDate: etaDlaDate ? new Date(etaDlaDate).toISOString() : null,
          salesOrder,
          taskNumber,
          serialNumber,
          toxCode,
          payRatePrimary,
          payRateSecondary,
          fieldEngineerId: fieldEngineerId || null,
          fieldEngineerName,
          engineerPhone,
          engineerContactAlt,
          engineerEmail,
          workedStartTime: workedStartTime ? new Date(workedStartTime).toISOString() : null,
          workedEndTime: workedEndTime ? new Date(workedEndTime).toISOString() : null,
          hours: parseFloat(hours) || 0,
          authorizedExpenses: parseFloat(authorizedExpenses) || 0,
          expenses: parseFloat(expenses) || 0,
          incurredExpenses: parseFloat(incurredExpenses) || 0,
          hourlyRate: parseFloat(hourlyRate) || 0,
          billRate: parseFloat(billRate) || 0,
          flatRate: parseFloat(flatRate) || 0,
          editManually,
          approveStatusSigner,
          comments,
        }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to create");
      }

      if (attachments.length > 0) {
        const { workOrder } = resData;
        const attachForm = new FormData();
        attachForm.append("workOrderId", workOrder.id);
        for (const file of attachments) {
          attachForm.append("files", file);
        }
        await fetch("/api/attachments", { method: "POST", body: attachForm });
      }
    },
    onSuccess: () => onSubmit(),
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!clientName) errs.clientName = "Client is required";
    if (!jobPlatformName) errs.jobPlatform = "Job Platform is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      submitMut.mutate();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allowed = getAllowedExtensions();
    const invalid = files.filter(f => !allowed.includes(`.${f.name.split('.').pop()?.toLowerCase()}`));
    if (invalid.length > 0) {
      setErrors({ ...errors, attachments: `Invalid file type: ${invalid.map(f => f.name).join(", ")}` });
      return;
    }
    const oversized = files.filter(f => f.size > ATTACHMENT_LIMITS.maxFileSizeMB * 1024 * 1024);
    if (oversized.length > 0) {
      setErrors({ ...errors, attachments: `File exceeds ${ATTACHMENT_LIMITS.maxFileSizeMB}MB limit: ${oversized.map(f => f.name).join(", ")}` });
      return;
    }
    const total = attachments.length + files.length;
    if (total > ATTACHMENT_LIMITS.maxFiles) {
      setErrors({ ...errors, attachments: `Maximum ${ATTACHMENT_LIMITS.maxFiles} files allowed. You already have ${attachments.length}.` });
      return;
    }
    setAttachments(prev => [...prev, ...files]);
    setErrors({ ...errors, attachments: "" });
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const fmtDateForInput = (d: string) => {
    // Convert ISO to datetime-local format
    if (!d) return "";
    const dt = new Date(d);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  };

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-16 right-4 z-[60] bg-primary text-primary-foreground px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {toast}
          <button onClick={() => setToast(null)} className="ml-1 hover:opacity-70"><X className="h-3 w-3" /></button>
        </div>
      )}

      <Dialog open={open} onOpenChange={o => !o && onClose()}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl max-h-[94vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle className="text-lg font-semibold">New Ticket — Inbound Intake</DialogTitle>
        </DialogHeader>

        {/* Scrollable body */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 pb-2 space-y-5">

            {/* ── Section: Identification ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identification</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ticketId" className="text-sm">Ticket ID</Label>
                  <Input id="ticketId" value={ticketId} onChange={e => setTicketId(e.target.value)} className="h-10 w-full" />
                  <p className="text-[11px] text-muted-foreground">Auto-generated; you may override.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="client" className="text-sm">Client <span className="text-destructive">*</span></Label>
                  <div className="flex items-center gap-2">
                    <Select value={clientId} onValueChange={v => {
                      setClientId(v);
                      setClientName(clients.find(c => c.id === v)?.name || "");
                      setErrors({ ...errors, clientName: "" });
                    }}>
                      <SelectTrigger id="client" className={cn("h-10 w-full", errors.clientName && "border-destructive")}>
                        <SelectValue placeholder="Select client..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        <ScrollArea className="max-h-[240px]">
                          {clients.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                        </ScrollArea>
                        <div className="border-t mt-1 pt-1">
                          <button type="button" className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-primary hover:bg-primary/10 rounded-sm cursor-pointer" onClick={() => { setAddNewDialog("client"); setNewClientName(""); }}>
                            <Plus className="h-3 w-3" /> Add New Client
                          </button>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                  {errors.clientName && <p className="text-xs text-destructive">{errors.clientName}</p>}
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Section: Customer & Order References ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer &amp; Order References</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="salesOrder" className="text-sm">Sales Order (SO)</Label>
                  <Input id="salesOrder" value={salesOrder} onChange={e => setSalesOrder(e.target.value)} placeholder="e.g. SCD-1002" className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="taskNumber" className="text-sm">Task Number</Label>
                  <Input id="taskNumber" value={taskNumber} onChange={e => setTaskNumber(e.target.value)} placeholder="e.g. TSK-190" className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="serialNumber" className="text-sm">Serial #</Label>
                  <Input id="serialNumber" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="e.g. SN-98231" className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="toxCode" className="text-sm">TOX Code</Label>
                  <Input id="toxCode" value={toxCode} onChange={e => setToxCode(e.target.value)} placeholder="e.g. TOX-682" className="h-10 w-full" />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Section: Site Coordinates & Location ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Site Coordinates &amp; Location</h4>
              <div className="space-y-1.5">
                <Label htmlFor="streetAddress" className="text-sm">Street Address</Label>
                <Input id="streetAddress" value={streetAddress} onChange={e => setStreetAddress(e.target.value)} placeholder="e.g. 100 Corporate Plaza" className="h-10 w-full" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-sm">City</Label>
                  <Input id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="Dallas" className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-sm">State</Label>
                  <Input id="state" value={state} onChange={e => setState(e.target.value)} placeholder="TX" className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zipCode" className="text-sm">Zip Code</Label>
                  <Input id="zipCode" value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="75201" className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country" className="text-sm">Country</Label>
                  <Input id="country" value={country} onChange={e => setCountry(e.target.value)} placeholder="USA" className="h-10 w-full" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="etaDlaDate" className="text-sm">ETA / DLA Date &amp; Time</Label>
                  <Input id="etaDlaDate" type="datetime-local" value={etaDlaDate} onChange={e => setEtaDlaDate(e.target.value)} className="h-10 w-full" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pickupSiteNotes" className="text-sm">Pickup Site / Notes</Label>
                  <Input id="pickupSiteNotes" value={pickupSiteNotes} onChange={e => setPickupSiteNotes(e.target.value)} placeholder="Pickup warehouse/address" className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="deliverySiteNotes" className="text-sm">Delivery Site / Notes</Label>
                  <Input id="deliverySiteNotes" value={deliverySiteNotes} onChange={e => setDeliverySiteNotes(e.target.value)} placeholder="Delivery terminal/address" className="h-10 w-full" />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Section: Assignment & Status ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assignment &amp; Status</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="platform" className="text-sm">Job Platform <span className="text-destructive">*</span></Label>
                  <Select value={jobPlatformId} onValueChange={v => {
                    setJobPlatformId(v);
                    setJobPlatformName(platforms.find(p => p.id === v)?.name || "");
                    setErrors({ ...errors, jobPlatform: "" });
                  }}>
                    <SelectTrigger id="platform" className={cn("h-10 w-full", errors.jobPlatform && "border-destructive")}>
                      <SelectValue placeholder="Select platform..." />
                    </SelectTrigger>
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
                  {errors.jobPlatform && <p className="text-xs text-destructive">{errors.jobPlatform}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-sm">Initial Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status" className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <ScrollArea className="max-h-[240px]">
                        {STATUSES.map(s => (
                          <SelectItem key={s.key} value={s.key}>
                            <span className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-sm inline-block border border-black/10 shrink-0" style={{ backgroundColor: s.bg }} />
                              {s.label}
                            </span>
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="engineer" className="text-sm">Field Engineer</Label>
                  <Select value={fieldEngineerId} onValueChange={v => {
                    setFieldEngineerId(v);
                    setFieldEngineerName(engineers.find(e => e.id === v)?.name || "");
                  }}>
                    <SelectTrigger id="engineer" className="h-10 w-full">
                      <SelectValue placeholder="Select engineer..." />
                    </SelectTrigger>
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
              {/* Engineer contact details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="engPhone" className="text-sm">Engineer Phone</Label>
                  <Input id="engPhone" value={engineerPhone} onChange={e => setEngineerPhone(e.target.value)} placeholder="e.g. 512-555-8100" className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="engContactAlt" className="text-sm">FE Contact #</Label>
                  <Input id="engContactAlt" value={engineerContactAlt} onChange={e => setEngineerContactAlt(e.target.value)} placeholder="FE Direct Contact" className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="engEmail" className="text-sm">Engineer Email</Label>
                  <Input id="engEmail" type="email" value={engineerEmail} onChange={e => setEngineerEmail(e.target.value)} placeholder="engineer@tdxtech.com" className="h-10 w-full" />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Section: Time Tracking ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time Tracking</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startTime" className="text-sm">Worked Start Time</Label>
                  <Input id="startTime" type="datetime-local" value={workedStartTime} onChange={e => setWorkedStartTime(e.target.value)} className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endTime" className="text-sm">Worked End Time</Label>
                  <Input id="endTime" type="datetime-local" value={workedEndTime} onChange={e => setWorkedEndTime(e.target.value)} className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hours" className="text-sm">Hours</Label>
                  <Input
                    id="hours"
                    type="number"
                    step="0.25"
                    min="0"
                    value={hours}
                    onChange={e => setHours(e.target.value)}
                    placeholder="0.00"
                    className={cn("h-10 w-full", !editManually && "bg-muted")}
                    disabled={!editManually}
                  />
                  {!editManually && <p className="text-[11px] text-muted-foreground">Auto-calculated from start/end time</p>}
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Section: Pay Rates ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pay Rates</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="payPrimary" className="text-sm">Pay Rate (Primary)</Label>
                  <Select value={payRatePrimary} onValueChange={setPayRatePrimary}>
                    <SelectTrigger id="payPrimary" className="h-10 w-full">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <ScrollArea className="max-h-[240px]">
                        {PAY_RATE_TYPES_PRIMARY.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="paySecondary" className="text-sm">Pay Rate (Secondary)</Label>
                  <Select value={payRateSecondary} onValueChange={setPayRateSecondary}>
                    <SelectTrigger id="paySecondary" className="h-10 w-full">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
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

            {/* ── Section: Financials ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financials</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="hrRate" className="text-sm">Hourly Rate ($)</Label>
                  <Input id="hrRate" type="number" step="0.01" min="0" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="0.00" className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="authExpenses" className="text-sm">Authorized Expenses ($)</Label>
                  <Input id="authExpenses" type="number" step="0.01" min="0" value={authorizedExpenses} onChange={e => setAuthorizedExpenses(e.target.value)} placeholder="0.00" className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expenses" className="text-sm">Expenses ($)</Label>
                  <Input id="expenses" type="number" step="0.01" min="0" value={expenses} onChange={e => setExpenses(e.target.value)} placeholder="0.00" className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="incExpenses" className="text-sm">Incurred Expenses ($)</Label>
                  <Input id="incExpenses" type="number" step="0.01" min="0" value={incurredExpenses} onChange={e => setIncurredExpenses(e.target.value)} placeholder="0.00" className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="billRate" className="text-sm">Bill Rate ($)</Label>
                  <Input id="billRate" type="number" step="0.01" min="0" value={billRate} onChange={e => setBillRate(e.target.value)} placeholder="0.00" className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="flatRate" className="text-sm">Flat Rate ($)</Label>
                  <Input id="flatRate" type="number" step="0.01" min="0" value={flatRate} onChange={e => setFlatRate(e.target.value)} placeholder="0.00" className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="approveSigner" className="text-sm">Approve Status / Signer</Label>
                  <Input id="approveSigner" value={approveStatusSigner} onChange={e => setApproveStatusSigner(e.target.value)} placeholder="e.g. Yes - Approved by Mark" className="h-10 w-full" />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Section: Automated Rate Calculator ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calculator className="h-3.5 w-3.5" />
                  Automated Rate Calculator
                </h4>
                <div className="flex items-center gap-2 cursor-pointer select-none" onClick={(e) => { e.preventDefault(); setEditManually(!editManually); }}>
                  <Checkbox checked={editManually} onCheckedChange={(v) => setEditManually(v === true)} />
                  <span className="text-xs text-muted-foreground">Edit Manually</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg bg-muted/50 border">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Hours</p>
                  {editManually ? (
                    <Input type="number" step="0.25" min="0" value={hours} onChange={e => setHours(e.target.value)} className="h-10 w-full" />
                  ) : (
                    <p className="text-lg font-semibold">{hoursNum.toFixed(1)} hrs</p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Calculated Pay</p>
                  {editManually ? (
                    <Input type="number" step="0.01" min="0" value={manualPay || calculatedPay.toFixed(2)} onChange={e => setManualPay(e.target.value)} className="h-10 w-full" placeholder="0.00" />
                  ) : (
                    <p className="text-lg font-semibold text-primary">${calculatedPay.toFixed(2)}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">Paid @ ${hourlyRateNum.toFixed(2)}/hr</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Calculated Bill</p>
                  {editManually ? (
                    <Input type="number" step="0.01" min="0" value={manualBill || calculatedBill.toFixed(2)} onChange={e => setManualBill(e.target.value)} className="h-10 w-full" placeholder="0.00" />
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

            {/* ── Section: Comments ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inbound Comments / Requirements</h4>
              <div className="space-y-1.5">
                <Textarea id="comments" value={comments} onChange={e => setComments(e.target.value)} rows={3} placeholder="Log dispatch constraints, scope of work, etc." className="w-full" />
              </div>
            </div>

            <Separator />

            {/* ── Section: Attachments ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Paperclip className="h-3 w-3" />
                Attachments
              </h4>
              <div className="flex items-center gap-2 flex-wrap">
                <Button type="button" variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-1.5" />
                    Upload Files
                    <input type="file" multiple className="hidden" accept={getAllowedExtensions().join(",")} onChange={handleFileSelect} />
                  </label>
                </Button>
                <span className="text-xs text-muted-foreground">
                  Max {ATTACHMENT_LIMITS.maxFiles} files, {ATTACHMENT_LIMITS.maxFileSizeMB}MB each.
                  Supported: {getAllowedExtensions().join(", ")}
                </span>
              </div>
              {errors.attachments && <p className="text-xs text-destructive">{errors.attachments}</p>}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((f, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1.5 px-2.5 py-1 text-xs">
                      {f.name}
                      <button type="button" onClick={() => removeAttachment(i)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t shrink-0 bg-background">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitMut.isPending}>
            {submitMut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Submit Work Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Add New Client Dialog */}
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

    {/* Add New Platform Dialog */}
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

    {/* Add New Engineer Dialog */}
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