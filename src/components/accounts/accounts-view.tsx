"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Link2,
  Unlink,
  CreditCard,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  CalendarClock,
  Zap,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  BarChart3,
  FileText,
  Users,
  Settings,
  AlertTriangle,
  ExternalLink,
  Building2,
  BookOpen,
  Shield,
  Wifi,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QBStatus {
  connected: boolean;
  configured: boolean;
  accountName: string | null;
  connectedAt: string | null;
  realmId: string | null;
  syncStatus: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  tokenExpired: boolean | null;
}

interface SyncLog {
  id: string;
  syncType: string;
  direction: string;
  entityType: string;
  entityId: string;
  qbId: string;
  status: string;
  summary: string;
  syncedAt: string;
}

export function AccountsView() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [payOpen, setPayOpen] = useState(false);
  const [payInvoiceId, setPayInvoiceId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Card");
  const [cancelPayId, setCancelPayId] = useState<string | null>(null);
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
  const [oauthPopup, setOauthPopup] = useState(false);
  const [syncResults, setSyncResults] = useState<{ synced: string[]; errors: string[]; total: number } | null>(null);
  const [activeQBTab, setActiveQBTab] = useState("overview");

  const isAdmin = user?.role === "Super Admin" || user?.role === "Admin";

  // QuickBooks connection
  const { data: qbData, refetch: refetchQB, isLoading: qbLoading } = useQuery({
    queryKey: ["quickbooks"],
    queryFn: () => fetch("/api/accounts/quickbooks").then(r => r.json()),
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  // Sync logs
  const { data: syncLogsData } = useQuery({
    queryKey: ["qb-sync-logs"],
    queryFn: () => fetch("/api/accounts/quickbooks/sync-logs").then(r => r.json()),
    enabled: !!qbData?.connected,
  });
  const syncLogs = (syncLogsData?.logs as SyncLog[]) || [];

  // Payments
  const { data: paymentsData, isLoading: payLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => fetch("/api/accounts/payments").then(r => r.json()),
  });
  const payments = (paymentsData?.payments as { id: string; invoiceId: string; amount: number; method: string; status: string; scheduledDate: string | null; createdAt: string }[]) || [];

  // Invoices (for submit payment dropdown)
  const { data: invoicesData } = useQuery({
    queryKey: ["invoices-accounts"],
    queryFn: () => fetch("/api/invoices?pageSize=100").then(r => r.json()),
  });
  const invoices = (invoicesData?.invoices as { id: string; invoiceNumber: string; clientName: string; total: number; status: string }[]) || [];
  const pendingInvoices = invoices.filter(i => i.status === "Pending" || i.status === "Draft");

  const showToast = useCallback((msg: string, type: "success" | "error") => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Handle OAuth callback messages from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qbConnected = params.get("qb_connected");
    const qbError = params.get("qb_error");

    if (qbConnected === "1") {
      const company = params.get("company") || "QuickBooks Account";
      // Use refetch + queryKey invalidation instead of direct setState inside effect
      refetchQB();
      qc.invalidateQueries({ queryKey: ["qb-sync-logs"] });
      // Clean URL
      window.history.replaceState({}, "", "/");
      // Schedule toast after effect
      setTimeout(() => showToast(`Connected to ${company}!`, "success"), 100);
    }
    if (qbError) {
      window.history.replaceState({}, "", "/");
      setTimeout(() => showToast(`QuickBooks connection failed: ${qbError}`, "error"), 100);
    }
  }, [showToast, refetchQB, qc]);

  // Connect QB (OAuth)
  const connectQBMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/accounts/quickbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect" }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        setOauthPopup(true);
        // Open OAuth window
        const w = window.open(data.authUrl, "QuickBooks Connect", "width=600,height=700,left=200,top=100");
        if (w) {
          // Poll for window close
          const poll = setInterval(() => {
            if (w.closed) {
              clearInterval(poll);
              setOauthPopup(false);
              refetchQB();
            }
          }, 1000);
        }
      } else if (data.error) {
        showToast(data.error, "error");
      }
    },
    onError: () => showToast("Failed to initiate QuickBooks connection", "error"),
  });

  // Disconnect QB
  const disconnectQBMut = useMutation({
    mutationFn: () => fetch("/api/accounts/quickbooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect" }),
    }),
    onSuccess: () => {
      setDisconnectConfirm(false);
      refetchQB();
      showToast("Disconnected from QuickBooks", "success");
    },
  });

  // Sync invoices to QB
  const syncInvoicesMut = useMutation({
    mutationFn: (invoiceIds?: string[]) => fetch("/api/accounts/quickbooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync", syncType: "invoices", invoiceIds }),
    }).then(r => r.json()),
    onSuccess: (data) => {
      refetchQB();
      qc.invalidateQueries({ queryKey: ["qb-sync-logs"] });
      if (data.synced) {
        setSyncResults(data);
        showToast(`Synced ${data.synced.length} invoices`, "success");
      }
    },
    onError: () => showToast("Invoice sync failed", "error"),
  });

  // Sync payments to QB
  const syncPaymentsMut = useMutation({
    mutationFn: () => fetch("/api/accounts/quickbooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync", syncType: "payments" }),
    }).then(r => r.json()),
    onSuccess: (data) => {
      refetchQB();
      qc.invalidateQueries({ queryKey: ["qb-sync-logs"] });
      showToast(`Synced ${data.synced?.length || 0} payments`, "success");
    },
    onError: () => showToast("Payment sync failed", "error"),
  });

  // Pull data from QB
  const pullDataMut = useMutation({
    mutationFn: () => fetch("/api/accounts/quickbooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync", syncType: "pull" }),
    }).then(r => r.json()),
    onSuccess: () => {
      refetchQB();
      qc.invalidateQueries({ queryKey: ["qb-sync-logs"] });
      showToast("Data pulled from QuickBooks", "success");
    },
    onError: () => showToast("Pull failed", "error"),
  });

  // Fetch QB report
  const [reportData, setReportData] = useState<{ type: string; data: unknown } | null>(null);
  const fetchReportMut = useMutation({
    mutationFn: (reportType: string) => fetch("/api/accounts/quickbooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "report", syncType: reportType }),
    }).then(r => r.json()),
    onSuccess: (data, reportType) => {
      setReportData({ type: reportType, data });
      showToast(`Report loaded: ${reportType}`, "success");
    },
    onError: () => showToast("Failed to fetch report", "error"),
  });

  const qb = qbData as QBStatus | undefined;
  const fmt = (v: number) => `$${v.toFixed(2)}`;
  const fmtDate = (d: string | null) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }); } catch { return d; }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "Completed": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Pending": return <Clock className="h-4 w-4 text-yellow-600" />;
      case "Scheduled": return <CalendarClock className="h-4 w-4 text-blue-600" />;
      case "Cancelled": return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const syncStatusBadge = (status: string | null) => {
    switch (status) {
      case "syncing": return <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400 gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Syncing</Badge>;
      case "synced": return <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400 gap-1"><CheckCircle className="h-3 w-3" /> Synced</Badge>;
      case "error": return <Badge variant="outline" className="border-red-500 text-red-600 dark:text-red-400 gap-1"><XCircle className="h-3 w-3" /> Error</Badge>;
      default: return <Badge variant="outline" className="border-gray-400 text-muted-foreground gap-1">Idle</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-16 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2",
          toastType === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}>
          {toast}
          <button onClick={() => setToast(null)} className="ml-1 hover:opacity-70"><X className="h-3 w-3" /></button>
        </div>
      )}

      <h2 className="text-xl font-semibold flex items-center gap-2">
        <div className="h-6 w-1.5 rounded brand-gradient" />
        Accounts & QuickBooks
      </h2>

      {/* QuickBooks Integration Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">QuickBooks Online Integration</CardTitle>
            </div>
            {qb?.connected && syncStatusBadge(qb.syncStatus)}
          </div>
          <CardDescription className="text-xs">
            Sync invoices, payments, and financial data between TDX Dispatch Portal and QuickBooks Online
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {qbLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !qb?.configured ? (
            /* NOT CONFIGURED */
            <div className="text-center py-8 space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Settings className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">QuickBooks OAuth Not Configured</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Set <code className="bg-muted px-1.5 py-0.5 rounded text-xs">QB_CLIENT_ID</code> and <code className="bg-muted px-1.5 py-0.5 rounded text-xs">QB_CLIENT_SECRET</code> in your <code className="bg-muted px-1.5 py-0.5 rounded text-xs">.env</code> file to enable OAuth 2.0 connection.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your credentials from the{" "}
                <span className="text-primary font-medium">Intuit Developer Portal</span>
              </p>
            </div>
          ) : !qb?.connected ? (
            /* NOT CONNECTED — SHOW CONNECT BUTTON */
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/30">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shrink-0">
                  <ExternalLink className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Connect to QuickBooks Online</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Authorize TDX Dispatch Portal to access your QuickBooks company data. 
                    This will open a secure Intuit login window where you can sign in and approve the connection.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button size="sm" onClick={() => connectQBMut.mutate()} disabled={connectQBMut.isPending}>
                      {connectQBMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
                      Connect to QuickBooks
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: <FileText className="h-5 w-5" />, title: "Sync Invoices", desc: "Push TDX invoices to QuickBooks" },
                  { icon: <DollarSign className="h-5 w-5" />, title: "Sync Payments", desc: "Record payments in both systems" },
                  { icon: <BarChart3 className="h-5 w-5" />, title: "Financial Reports", desc: "P&L, Balance Sheet, AR Aging" },
                ].map(f => (
                  <div key={f.title} className="p-3 border rounded-lg opacity-60">
                    <div className="text-muted-foreground">{f.icon}</div>
                    <p className="text-sm font-medium mt-1">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* CONNECTED — SHOW FULL FEATURES */
            <div className="space-y-4">
              {/* Connection Info */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{qb.accountName}</span>
                      <Badge variant="outline" className="text-xs border-green-400 text-green-600 dark:text-green-400">Connected</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Realm: {qb.realmId?.slice(0, 12)}... • Since {fmtDate(qb.connectedAt)} • Last sync: {fmtDate(qb.lastSyncAt)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetchQB()} className="text-xs">
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDisconnectConfirm(true)} className="text-xs text-red-600 border-red-300 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30">
                    <Unlink className="h-3.5 w-3.5 mr-1" /> Disconnect
                  </Button>
                </div>
              </div>

              {qb.lastSyncError && (
                <div className="p-3 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="text-sm"><span className="font-medium text-red-600">Last sync error:</span> <span className="text-muted-foreground">{qb.lastSyncError}</span></div>
                </div>
              )}

              {qb.tokenExpired && (
                <div className="p-3 border border-yellow-200 dark:border-yellow-900 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  <div className="text-sm"><span className="font-medium text-yellow-600">Token expired.</span> <span className="text-muted-foreground">Please reconnect to QuickBooks to refresh your authorization.</span></div>
                </div>
              )}

              {/* QuickBooks Feature Tabs */}
              <Tabs value={activeQBTab} onValueChange={setActiveQBTab}>
                <TabsList className="grid w-full grid-cols-4 h-9">
                  <TabsTrigger value="overview" className="text-xs gap-1"><Wifi className="h-3.5 w-3.5" /> Overview</TabsTrigger>
                  <TabsTrigger value="sync" className="text-xs gap-1"><RefreshCw className="h-3.5 w-3.5" /> Sync</TabsTrigger>
                  <TabsTrigger value="reports" className="text-xs gap-1"><BarChart3 className="h-3.5 w-3.5" /> Reports</TabsTrigger>
                  <TabsTrigger value="logs" className="text-xs gap-1"><BookOpen className="h-3.5 w-3.5" /> Logs</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Account", value: qb.accountName, icon: <Building2 className="h-4 w-4" /> },
                      { label: "Realm ID", value: qb.realmId?.slice(0, 16) || "—", icon: <Shield className="h-4 w-4" /> },
                      { label: "Connected", value: fmtDate(qb.connectedAt), icon: <Wifi className="h-4 w-4" /> },
                      { label: "Last Sync", value: fmtDate(qb.lastSyncAt), icon: <RefreshCw className="h-4 w-4" /> },
                    ].map(s => (
                      <div key={s.label} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">{s.icon} {s.label}</div>
                        <div className="text-sm font-medium truncate">{s.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" /> Available Actions
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="justify-start text-xs h-9" onClick={() => syncInvoicesMut.mutate(undefined)} disabled={syncInvoicesMut.isPending}>
                        {syncInvoicesMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <ArrowUpRight className="h-3.5 w-3.5 mr-1" />}
                        Push All Invoices to QuickBooks
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start text-xs h-9" onClick={() => syncPaymentsMut.mutate()} disabled={syncPaymentsMut.isPending}>
                        {syncPaymentsMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <ArrowUpRight className="h-3.5 w-3.5 mr-1" />}
                        Push All Payments to QuickBooks
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start text-xs h-9" onClick={() => pullDataMut.mutate()} disabled={pullDataMut.isPending}>
                        {pullDataMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <ArrowDownLeft className="h-3.5 w-3.5 mr-1" />}
                        Pull Data from QuickBooks
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start text-xs h-9" onClick={() => setActiveQBTab("reports")}>
                        <BarChart3 className="h-3.5 w-3.5 mr-1" />
                        View Financial Reports
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* SYNC TAB */}
                <TabsContent value="sync" className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Push Invoices */}
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowUpRight className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-sm">Push Invoices</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Send TDX Portal invoices to QuickBooks Online. Creates matching Invoice records in your QuickBooks company.
                      </p>
                      <Button size="sm" className="w-full" onClick={() => syncInvoicesMut.mutate(undefined)} disabled={syncInvoicesMut.isPending}>
                        {syncInvoicesMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Syncing...</> : <><ArrowUpRight className="h-4 w-4 mr-1" /> Sync All Invoices</>}
                      </Button>
                    </Card>

                    {/* Push Payments */}
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-sm">Push Payments</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Record completed payments in QuickBooks. Links payments to existing QuickBooks invoices automatically.
                      </p>
                      <Button size="sm" className="w-full" onClick={() => syncPaymentsMut.mutate()} disabled={syncPaymentsMut.isPending}>
                        {syncPaymentsMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Syncing...</> : <><ArrowUpRight className="h-4 w-4 mr-1" /> Sync All Payments</>}
                      </Button>
                    </Card>

                    {/* Pull Data */}
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowDownLeft className="h-4 w-4 text-purple-600" />
                        <span className="font-semibold text-sm">Pull All Data</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Pull customers, invoices, payments, and chart of accounts from QuickBooks into the portal.
                      </p>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => pullDataMut.mutate()} disabled={pullDataMut.isPending}>
                        {pullDataMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Pulling...</> : <><ArrowDownLeft className="h-4 w-4 mr-1" /> Pull from QuickBooks</>}
                      </Button>
                    </Card>

                    {/* Sync Customers */}
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-orange-600" />
                        <span className="font-semibold text-sm">Sync Clients</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Match TDX clients with QuickBooks customers. Create missing customers in QuickBooks automatically.
                      </p>
                      <Button size="sm" variant="outline" className="w-full" disabled>
                        <Users className="h-4 w-4 mr-1" /> Sync Clients (Coming Soon)
                      </Button>
                    </Card>
                  </div>

                  {/* Sync Results */}
                  {syncResults && (
                    <Card className="p-4">
                      <h4 className="text-sm font-semibold mb-2">Sync Results</h4>
                      {syncResults.synced.length > 0 && (
                        <div className="mb-2">
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">✓ {syncResults.synced.length} synced</Badge>
                          <div className="text-xs text-muted-foreground mt-1">{syncResults.synced.join(", ")}</div>
                        </div>
                      )}
                      {syncResults.errors.length > 0 && (
                        <div>
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">✗ {syncResults.errors.length} errors</Badge>
                          <div className="text-xs text-red-500 mt-1">{syncResults.errors.join("; ")}</div>
                        </div>
                      )}
                      <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setSyncResults(null)}>Dismiss</Button>
                    </Card>
                  )}
                </TabsContent>

                {/* REPORTS TAB */}
                <TabsContent value="reports" className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Card className="p-4 hover:border-primary/50 cursor-pointer transition-colors" onClick={() => fetchReportMut.mutate("profit_loss")}>
                      <BarChart3 className="h-5 w-5 text-primary mb-2" />
                      <h4 className="text-sm font-semibold">Profit & Loss</h4>
                      <p className="text-xs text-muted-foreground mt-1">Income vs Expenses overview from QuickBooks</p>
                      {fetchReportMut.isPending && fetchReportMut.variables === "profit_loss" && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
                    </Card>
                    <Card className="p-4 hover:border-primary/50 cursor-pointer transition-colors" onClick={() => fetchReportMut.mutate("balance_sheet")}>
                      <BookOpen className="h-5 w-5 text-primary mb-2" />
                      <h4 className="text-sm font-semibold">Balance Sheet</h4>
                      <p className="text-xs text-muted-foreground mt-1">Assets, liabilities, and equity snapshot</p>
                      {fetchReportMut.isPending && fetchReportMut.variables === "balance_sheet" && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
                    </Card>
                    <Card className="p-4 hover:border-primary/50 cursor-pointer transition-colors" onClick={() => fetchReportMut.mutate("aging")}>
                      <Clock className="h-5 w-5 text-primary mb-2" />
                      <h4 className="text-sm font-semibold">AR Aging</h4>
                      <p className="text-xs text-muted-foreground mt-1">Outstanding receivables by aging period</p>
                      {fetchReportMut.isPending && fetchReportMut.variables === "aging" && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
                    </Card>
                  </div>

                  {/* Report Data Display */}
                  {reportData && (
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          {reportData.type === "profit_loss" ? "Profit & Loss" : reportData.type === "balance_sheet" ? "Balance Sheet" : "AR Aging"}
                        </h4>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setReportData(null)}>
                          <X className="h-3 w-3 mr-1" /> Clear
                        </Button>
                      </div>
                      {reportData.data && typeof reportData.data === "object" ? (
                        <div className="custom-scroll max-h-[300px] overflow-auto">
                          <pre className="text-xs bg-muted/50 rounded-md p-3 whitespace-pre-wrap">{JSON.stringify(reportData.data, null, 2)}</pre>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No report data returned from QuickBooks.</p>
                      )}
                    </Card>
                  )}
                </TabsContent>

                {/* LOGS TAB */}
                <TabsContent value="logs" className="mt-4">
                  <Card className="p-0">
                    <div className="custom-scroll max-h-[400px] overflow-x-auto overflow-y-auto">
                      <Table className="min-w-[700px]">
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3">Status</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3">Type</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3">Direction</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3">Entity</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3">Summary</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3">Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {syncLogs.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="h-20 text-center text-muted-foreground text-sm">No sync activity yet.</TableCell></TableRow>
                          ) : syncLogs.map(log => (
                            <TableRow key={log.id} className="hover:bg-muted/30">
                              <TableCell className="px-3 py-2">
                                {log.status === "success" ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                              </TableCell>
                              <TableCell className="px-3 py-2 text-xs">{log.syncType}</TableCell>
                              <TableCell className="px-3 py-2">
                                <Badge variant="outline" className="text-xs">
                                  {log.direction === "push" ? <><ArrowUpRight className="h-3 w-3 mr-0.5" /> Push</> : <><ArrowDownLeft className="h-3 w-3 mr-0.5" /> Pull</>}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-3 py-2 text-xs font-medium">{log.entityType}</TableCell>
                              <TableCell className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate">{log.summary}</TableCell>
                              <TableCell className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(log.syncedAt)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => { setPayOpen(true); }}>
          <DollarSign className="h-4 w-4 mr-1" /> Submit Payment
        </Button>
        <Button size="sm" variant="outline" onClick={() => {
          fetch("/api/accounts/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bulk", method: "Card" }) })
            .then(r => { if (!r.ok) throw new Error("Server error"); return r.json(); })
            .then(() => { qc.invalidateQueries({ queryKey: ["payments"] }); qc.invalidateQueries({ queryKey: ["invoices-accounts"] }); showToast("Bulk payment processed", "success"); })
            .catch(() => showToast("Bulk payment failed", "error"));
        }}>
          <Zap className="h-4 w-4 mr-1" /> Bulk Pay (All Pending)
        </Button>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Payment History</CardTitle>
          <CardDescription className="text-xs">All recorded payments</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="custom-scroll max-h-[400px] overflow-x-auto overflow-y-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3">Invoice</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3 text-right">Amount</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3">Method</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3">Scheduled</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3">Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3 w-16">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payLoading ? (
                  <TableRow><TableCell colSpan={7} className="h-20 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : payments.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-20 text-center text-muted-foreground">No payments recorded.</TableCell></TableRow>
                ) : (
                  payments.map(p => {
                    const inv = invoices.find(i => i.id === p.invoiceId);
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/30">
                        <TableCell className="px-3 py-2">
                          <div className="flex items-center gap-1.5">{statusIcon(p.status)}<span className="text-sm">{p.status}</span></div>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm">{inv?.invoiceNumber || p.invoiceId.slice(0, 8)}</TableCell>
                        <TableCell className="px-3 py-2 text-sm text-right font-medium">{fmt(p.amount)}</TableCell>
                        <TableCell className="px-3 py-2 text-sm">{p.method}</TableCell>
                        <TableCell className="px-3 py-2 text-sm">{fmtDate(p.scheduledDate)}</TableCell>
                        <TableCell className="px-3 py-2 text-sm">{fmtDate(p.createdAt)}</TableCell>
                        <TableCell className="px-3 py-2">
                          {(p.status === "Pending" || p.status === "Scheduled") && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCancelPayId(p.id)} title="Cancel">
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Submit Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={o => !o && setPayOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Submit Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Invoice</Label>
              <Select value={payInvoiceId} onValueChange={v => {
                setPayInvoiceId(v);
                const inv = pendingInvoices.find(i => i.id === v);
                if (inv) setPayAmount(String(inv.total));
              }}>
                <SelectTrigger><SelectValue placeholder="Select invoice..." /></SelectTrigger>
                <SelectContent>
                  {pendingInvoices.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.invoiceNumber} — {i.clientName} ({fmt(i.total)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Amount ($)</Label>
              <Input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="ACH">ACH</SelectItem>
                  <SelectItem value="Check">Check</SelectItem>
                  <SelectItem value="Wire">Wire Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              await fetch("/api/accounts/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId: payInvoiceId, amount: parseFloat(payAmount), method: payMethod }) });
              setPayOpen(false); qc.invalidateQueries({ queryKey: ["payments"] }); qc.invalidateQueries({ queryKey: ["invoices-accounts"] }); setToast("Payment submitted");
            }} disabled={!payInvoiceId || !payAmount}>Submit Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Payment Confirmation */}
      <Dialog open={!!cancelPayId} onOpenChange={o => !o && setCancelPayId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancel Payment</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to cancel this payment? The associated invoice will return to Pending status.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelPayId(null)}>Keep</Button>
            <Button variant="destructive" onClick={async () => {
              if (cancelPayId) {
                await fetch(`/api/accounts/payments/${cancelPayId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Cancelled" }) });
                setCancelPayId(null); qc.invalidateQueries({ queryKey: ["payments"] }); setToast("Payment cancelled");
              }
            }}>Cancel Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation */}
      <Dialog open={disconnectConfirm} onOpenChange={o => !o && setDisconnectConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Unlink className="h-5 w-5 text-red-600" /> Disconnect QuickBooks</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect from QuickBooks Online? 
              Sync settings and logs will be preserved, but you will need to reconnect to sync data again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => disconnectQBMut.mutate()} disabled={disconnectQBMut.isPending}>
              {disconnectQBMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OAuth Popup Waiting Overlay */}
      <Dialog open={oauthPopup} onOpenChange={o => { if (!o) setOauthPopup(false); }}>
        <DialogContent className="max-w-sm" onInteractOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Connecting to QuickBooks...
            </DialogTitle>
            <DialogDescription>
              A new window has opened for you to sign in to your QuickBooks account and authorize the connection. 
              This window will close automatically when done.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="mx-auto w-20 h-20 rounded-xl bg-gradient-to-br from-blue-500 to-green-600 flex items-center justify-center mb-3">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <p className="text-sm text-muted-foreground">
              Waiting for authorization...
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setOauthPopup(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
