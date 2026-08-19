"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Plus,
  Trash2,
  Edit3,
  Users,
  Shield,
  Palette,
  Bell,
  Database,
  RotateCcw,
  UserPlus,
  Ban,
  Landmark,
  CheckCircle,
  X,
  ShieldCheck,
  Copy,
  Info,
} from "lucide-react";
import {
  COLOR_THEMES,
  PERMISSIONS,
  SYSTEM_ROLES,
  NOTIFICATION_TYPES,
} from "@/lib/constants";
import type { ColorThemeKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function AdminView({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { user } = useAuth();
  const { colorTheme, setColorTheme, darkMode, toggleDarkMode } = useTheme();
  const qc = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  
  useEffect(() => { if (toast) setTimeout(() => setToast(null), 3000); }, [toast]);
  
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  
  // Roles Tab State
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [seedConfirm, setSeedConfirm] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [seedSections, setSeedSections] = useState<Record<string, boolean>>({ clients: true, engineers: true, platforms: true, workOrders: true, invoices: true });
  const [clearSections, setClearSections] = useState<Record<string, boolean>>({ workOrders: true, invoices: true, payments: true, attachments: true });

  // Notification preferences state
  const [notifyPrefs, setNotifyPrefs] = useState<Record<string, { email: boolean; inApp: boolean }>>(() => {
    const initial: Record<string, { email: boolean; inApp: boolean }> = {};
    NOTIFICATION_TYPES.forEach(t => { initial[t.key] = { email: true, inApp: true }; });
    return initial;
  });
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietFrom, setQuietFrom] = useState("18:00");
  const [quietTo, setQuietTo] = useState("08:00");

  // Save notification preferences
  const saveNotifyMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyPrefs, quietHours: quietHoursEnabled ? { enabled: true, from: quietFrom, to: quietTo } : { enabled: false } }),
      });
      if (!res.ok) throw new Error("Save failed");
    },
    onSuccess: () => setToast("Notification preferences saved"),
    onError: () => setToast("Failed to save preferences"),
  });

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users-admin"],
    queryFn: () => fetch("/api/users").then(r => r.json()),
  });
  const users = (usersData?.users as { id: string; email: string; name: string; role: string; status: string; createdAt: string }[]) || [];

  // Fetch roles
  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: () => fetch("/api/roles").then(r => r.json()),
  });
  const roles = (rolesData?.roles as { id: string; name: string; description: string; permissions: string; isSystem: boolean }[]) || [];

  // Initialize active role
  useEffect(() => {
    if (!activeRoleId && !isCreatingRole && roles.length > 0) {
      setActiveRoleId(roles[0].id);
    }
  }, [roles, activeRoleId, isCreatingRole]);

  // Delete user mutation
  const deleteUserMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users-admin"] }); setDeleteUserId(null); setToast("User deactivated"); },
    onError: (e: Error) => setToast(e.message),
  });

  // Edit user mutation
  const editUserMut = useMutation({
    mutationFn: async ({ id, name, role, status }: { id: string; name: string; role: string; status: string }) => {
      const res = await fetch(`/api/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, role, status }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users-admin"] }); setEditUserId(null); setToast("User updated"); },
    onError: (e: Error) => setToast(e.message),
  });

  // Add user mutation
  const addUserMut = useMutation({
    mutationFn: async (data: { name: string; email: string; role: string }) => {
      const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
    onSuccess: () => { setAddUserOpen(false); qc.invalidateQueries({ queryKey: ["users-admin"] }); setToast("User added"); },
  });

  // Delete role mutation
  const deleteRoleMut = useMutation({
    mutationFn: async (id: string) => fetch(`/api/roles/${id}`, { method: "DELETE" }),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ["roles"] }); 
      setDeleteRoleId(null); 
      setActiveRoleId(roles[0]?.id || null);
      setToast("Role deleted"); 
    },
  });

  // Seed mutation
  const seedMut = useMutation({
    mutationFn: () => fetch("/api/admin/seed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sections: seedSections }) }).then(r => r.json()),
    onSuccess: () => { setSeedConfirm(false); qc.invalidateQueries({ queryKey: ["users-admin"] }); qc.invalidateQueries({ queryKey: ["roles"] }); setToast("Database seeded"); },
  });

  // Clear mutation
  const clearMut = useMutation({
    mutationFn: () => fetch("/api/admin/clear", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sections: clearSections }) }).then(r => r.json()),
    onSuccess: () => { setClearConfirm(false); setToast("Data cleared"); },
  });

  const isSuperAdmin = user?.role === "Super Admin";

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-16 right-4 z-50 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {toast}
          <button onClick={() => setToast(null)} className="ml-1 hover:opacity-70"><X className="h-3 w-3" /></button>
        </div>
      )}
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <div className="h-6 w-1.5 rounded brand-gradient" />
        Admin & Settings
      </h2>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="users" className="gap-1"><Users className="h-4 w-4" />Users</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1"><Shield className="h-4 w-4" />Roles</TabsTrigger>
          <TabsTrigger value="theme" className="gap-1"><Palette className="h-4 w-4" />Theme</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1"><Bell className="h-4 w-4" />Notifications</TabsTrigger>
          <TabsTrigger value="quickbooks" className="gap-1"><Landmark className="h-4 w-4" />QuickBooks</TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="data" className="gap-1"><Database className="h-4 w-4" />Data</TabsTrigger>
          )}
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setAddUserOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" /> Add User
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[500px] custom-scroll">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3">Name</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3">Email</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3">Role</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3">Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider h-9 px-3 w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow><TableCell colSpan={5} className="h-20 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : users.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No users found.</TableCell></TableRow>
                    ) : (
                      users.map(u => (
                        <TableRow key={u.id} className="hover:bg-muted/30">
                          <TableCell className="px-3 py-2 text-sm font-medium">{u.name}</TableCell>
                          <TableCell className="px-3 py-2 text-sm">{u.email}</TableCell>
                          <TableCell className="px-3 py-2">
                            <Badge variant="secondary" className="text-xs">{u.role}</Badge>
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            <Badge variant={u.status === "Active" ? "default" : "outline"} className={cn("text-xs", u.status === "Active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "text-destructive")}>{u.status}</Badge>
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditUserId(u.id)} title="Edit user">
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              {u.status === "Active" && u.id !== user?.id ? (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteUserId(u.id)} title="Deactivate">
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              ) : u.status === "Inactive" ? (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editUserMut.mutate({ id: u.id, name: u.name, role: u.role, status: "Active" })} title="Reactivate">
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab (Redesigned Split Pane)[cite: 7] */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex items-start justify-between bg-white dark:bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-md dark:bg-orange-900/30 dark:text-orange-400">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Access Roles</h3>
                <p className="text-sm text-muted-foreground">Define customer roles and configure category matrix capabilities for system directories and payment gateways.</p>
              </div>
            </div>
            <Button 
              className="bg-orange-600 hover:bg-orange-700 text-white" 
              onClick={() => { setIsCreatingRole(true); setActiveRoleId(null); }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add custom role
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Sidebar: Role List */}
            <div className="w-full lg:w-[350px] space-y-3 lg:border-r border-border lg:pr-6 shrink-0">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Company Access Levels</h4>
              
              <div className="space-y-2">
                {roles.map(role => {
                  const isActive = activeRoleId === role.id && !isCreatingRole;
                  let permsObj: Record<string, boolean> = {};
                  try { permsObj = JSON.parse(role.permissions); } catch { permsObj = {}; }
                  const permCount = Object.values(permsObj).filter(Boolean).length;

                  return (
                    <div
                      key={role.id}
                      onClick={() => { setActiveRoleId(role.id); setIsCreatingRole(false); }}
                      className={cn(
                        "rounded-lg p-4 cursor-pointer transition-all",
                        isActive 
                          ? "border-l-4 border-l-orange-500 border-t border-r border-b border-border bg-orange-50/50 dark:bg-orange-900/10 shadow-sm" 
                          : "border border-border hover:border-primary/40 bg-card"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">{role.name}</span>
                        <Badge variant="secondary" className={cn("text-[9px] uppercase font-bold", role.isSystem ? "bg-muted text-muted-foreground" : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400")}>
                          {role.isSystem ? "System" : "Custom"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                        {role.description || "No description provided."}
                      </p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                        <span className="text-xs text-orange-600 dark:text-orange-500 font-medium flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {permCount} Permissions
                        </span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          {!role.isSystem && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteRoleId(role.id); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Pane: Role Editor */}
            <div className="w-full flex-1">
              {(activeRoleId || isCreatingRole) && (
                <RoleEditorPane 
                  roleId={isCreatingRole ? null : activeRoleId} 
                  onCancel={() => {
                    setIsCreatingRole(false);
                    if (!activeRoleId && roles.length > 0) setActiveRoleId(roles[0].id);
                  }}
                  onSaved={(id) => {
                    setIsCreatingRole(false);
                    setActiveRoleId(id);
                    setToast(isCreatingRole ? "Role created successfully" : "Role updated successfully");
                  }}
                />
              )}
            </div>
          </div>
        </TabsContent>

        {/* Theme Tab */}
        <TabsContent value="theme" className="space-y-4">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">Dark Mode</h4>
                    <p className="text-xs text-muted-foreground">Toggle between light and dark appearance</p>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={() => toggleDarkMode()} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Color Theme</CardTitle>
                <CardDescription className="text-xs">Choose from 7 distinct color themes. Your selection persists across sessions.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {COLOR_THEMES.map(theme => (
                    <button
                      key={theme.key}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:shadow-md",
                        colorTheme === theme.key
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/30"
                      )}
                      onClick={() => setColorTheme(theme.key as ColorThemeKey)}
                    >
                      <div className="flex gap-1">
                        {theme.swatch.map((color, i) => (
                          <div key={i} className="h-6 w-6 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <span className="text-xs font-medium">{theme.label}</span>
                      <span className="text-[10px] text-muted-foreground">{theme.description}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Notification Preferences</CardTitle>
              <CardDescription className="text-xs">Configure which notifications you receive via email and in-app.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {NOTIFICATION_TYPES.map(type => (
                  <div key={type.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm">{type.label}</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs">
                        <Checkbox
                          checked={notifyPrefs[type.key]?.email ?? true}
                          onCheckedChange={(v) => setNotifyPrefs(prev => ({ ...prev, [type.key]: { ...prev[type.key], email: !!v } }))}
                        />
                        <span className="text-muted-foreground">Email</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs">
                        <Checkbox
                          checked={notifyPrefs[type.key]?.inApp ?? true}
                          onCheckedChange={(v) => setNotifyPrefs(prev => ({ ...prev, [type.key]: { ...prev[type.key], inApp: !!v } }))}
                        />
                        <span className="text-muted-foreground">In-App</span>
                      </label>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">Quiet Hours</h4>
                    <p className="text-xs text-muted-foreground">Suppress notifications during specified hours.</p>
                  </div>
                  <Switch checked={quietHoursEnabled} onCheckedChange={setQuietHoursEnabled} />
                </div>
                {quietHoursEnabled && (
                  <div className="flex items-center gap-3 text-sm">
                    <Label className="text-xs">From</Label>
                    <Input type="time" value={quietFrom} onChange={e => setQuietFrom(e.target.value)} className="w-28 h-8 text-xs" />
                    <Label className="text-xs">To</Label>
                    <Input type="time" value={quietTo} onChange={e => setQuietTo(e.target.value)} className="w-28 h-8 text-xs" />
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={() => saveNotifyMut.mutate()} disabled={saveNotifyMut.isPending}>
                    {saveNotifyMut.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    Save Preferences
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* QuickBooks Tab */}
        <TabsContent value="quickbooks" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">QuickBooks Integration</CardTitle>
              <CardDescription className="text-xs">Connect to QuickBooks Online for syncing invoices, payments, and financial reports.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Landmark className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">QuickBooks Online</p>
                    <p className="text-xs text-muted-foreground">Sync invoices, payments & financial reports</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => onNavigate?.("accounts")}>
                  Open Accounts
                </Button>
              </div>
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Connect via OAuth 2.0 to sync data between Techadox and QuickBooks</p>
                <p>• Push invoices and payments to QuickBooks automatically</p>
                <p>• Pull customers, invoices, and payments from QuickBooks</p>
                <p>• View Profit & Loss, Balance Sheet, and AR Aging reports</p>
                <p>• View sync history and logs in the Accounts tab</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Tab (Super Admin Only) */}
        {isSuperAdmin && (
          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" /> Seed Demo Data
                    </h4>
                    <p className="text-xs text-muted-foreground">Populate the database with sample data for selected sections.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSeedConfirm(true)}>
                    Seed Data
                  </Button>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                  {Object.entries(seedSections).map(([key, checked]) => (
                    <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => setSeedSections((prev) => ({ ...prev, [key]: !!v }))}
                      />
                      <span className="capitalize font-medium">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                    </label>
                  ))}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-destructive">
                      <Trash2 className="h-4 w-4" /> Clear Data
                    </h4>
                    <p className="text-xs text-muted-foreground">Delete data from selected sections. Users are preserved.</p>
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => setClearConfirm(true)}>
                    Clear Data
                  </Button>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                  {Object.entries(clearSections).map(([key, checked]) => (
                    <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => setClearSections((prev) => ({ ...prev, [key]: !!v }))}
                      />
                      <span className="capitalize font-medium">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-destructive/70 font-medium">⚠ Warning: Clearing data is permanent and cannot be undone.</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Edit User Dialog */}
      <EditUserDialog userId={editUserId} onClose={() => setEditUserId(null)} />

      {/* Add User Dialog */}
      <Dialog open={addUserOpen} onOpenChange={o => !o && setAddUserOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <AddUserForm onSubmit={() => { setAddUserOpen(false); qc.invalidateQueries({ queryKey: ["users-admin"] }); }} />
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={o => !o && setDeleteUserId(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader><AlertDialogTitle>Deactivate User</AlertDialogTitle><AlertDialogDescription>This will mark the user as inactive. They won&apos;t be able to sign in.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => deleteUserId && deleteUserMut.mutate(deleteUserId)}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Role Confirmation */}
      <AlertDialog open={!!deleteRoleId} onOpenChange={o => !o && setDeleteRoleId(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader><AlertDialogTitle>Delete Role</AlertDialogTitle><AlertDialogDescription>This cannot be undone. Users with this role will lose associated permissions.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => deleteRoleId && deleteRoleMut.mutate(deleteRoleId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Seed Confirmation */}
      <AlertDialog open={seedConfirm} onOpenChange={setSeedConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader><AlertDialogTitle>Seed Demo Data?</AlertDialogTitle><AlertDialogDescription>This will create sample data for: {Object.keys(seedSections).filter(k => seedSections[k]).join(", ")}. Existing data will not be overwritten.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => seedMut.mutate()}>Seed Data</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Confirmation */}
      <AlertDialog open={clearConfirm} onOpenChange={setClearConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader><AlertDialogTitle>Clear Selected Data?</AlertDialogTitle><AlertDialogDescription>This will permanently delete: {Object.keys(clearSections).filter(k => clearSections[k]).join(", ")}. Users and roles are preserved. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => clearMut.mutate()}>Clear Data</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Role Editor Split Pane Component ──

function RoleEditorPane({ roleId, onCancel, onSaved }: { roleId: string | null; onCancel: () => void; onSaved: (id: string) => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["role", roleId],
    queryFn: () => fetch(`/api/roles/${roleId}`).then(r => r.json()),
    enabled: !!roleId,
  });
  
  const existingRole = roleId ? (data?.role as { id: string; name: string; description: string; permissions: string; isSystem: boolean }) : null;

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [perms, setPerms] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (existingRole) {
      setName(existingRole.name || "");
      setDesc(existingRole.description || "");
      try { setPerms(JSON.parse(existingRole.permissions)); } catch { setPerms({}); }
    } else if (!roleId) {
      setName("");
      setDesc("");
      setPerms({});
    }
  }, [existingRole, roleId]);

  const mut = useMutation({
    mutationFn: async () => {
      const payload = { name, description: desc, permissions: perms };
      if (roleId) {
        const res = await fetch(`/api/roles/${roleId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("Failed to update");
        return res.json();
      } else {
        const res = await fetch("/api/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("Failed to create");
        return res.json();
      }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      onSaved(data.role?.id || roleId);
    },
  });

  // Group permissions conceptually to match the UI screenshot
  const groups = [
    {
      title: "New System Permissions",
      desc: "Manage core organization schemas and workspace identities.",
      keys: PERMISSIONS.slice(0, 4), // Fallback logic assuming standard PERMISSIONS array
    },
    {
      title: "Work & Pay Modules",
      desc: "Schedule work orders and track client payments records.",
      keys: PERMISSIONS.slice(4, 7),
    },
    {
      title: "Support & Communication",
      desc: "Liaise with support systems and open custom cases.",
      keys: PERMISSIONS.slice(7, 10),
    }
  ];

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {roleId && !existingRole ? (
               <div className="h-8 w-48 bg-muted animate-pulse rounded-md" />
            ) : (
              <>
                <Input 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className={cn("text-xl font-bold h-9 bg-transparent border-transparent hover:border-input focus:border-input px-2 -ml-2 min-w-[250px]", existingRole?.isSystem && "pointer-events-none")}
                  placeholder="Role Name"
                  readOnly={existingRole?.isSystem}
                />
                {existingRole?.isSystem && (
                  <span className="text-sm font-medium text-muted-foreground mt-1 whitespace-nowrap">(system immutable default)</span>
                )}
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground px-2 -ml-2 mt-1">
            Highest level privilege, full system authority including DATA CONTROL features.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={onCancel} disabled={mut.isPending}>Cancel</Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => mut.mutate()} disabled={mut.isPending || !name}>
            {mut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save changes
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="border border-border rounded-lg p-4 bg-card">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Modify Description Template:</Label>
          <span className="text-xs text-muted-foreground block mb-2">Description (Max 200 Characters)</span>
          <Input 
            value={desc} 
            onChange={e => setDesc(e.target.value)} 
            placeholder="Enter role description..." 
            className="w-full text-sm"
          />
        </div>
      </div>

      <div className="space-y-6 pb-8">
        {groups.map((group, gIdx) => group.keys.length > 0 && (
          <div key={gIdx} className="space-y-3">
            <div>
              <h4 className="text-base font-semibold">{group.title}</h4>
              <p className="text-xs text-muted-foreground">{group.desc}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.keys.map(p => (
                <div key={p.key} className="border border-border rounded-lg p-4 flex items-start gap-3 bg-card hover:border-primary/30 transition-colors">
                  <Checkbox 
                    checked={!!perms[p.key]} 
                    onCheckedChange={v => setPerms(prev => ({ ...prev, [p.key]: !!v }))} 
                    className="mt-0.5 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <div>
                    <Label className="text-sm font-semibold cursor-pointer">{p.label}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Grants access to capabilities mapped to this permission node.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 p-4 rounded-lg flex items-start gap-3 mt-8">
          <Info className="h-5 w-5 text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">
            <span className="font-bold">Security Matrix Guard Warning:</span> Modifications to system-immutable roles are safe-checked. Changes will be reflected instantly for logged-in sessions of any dispatcher holding that profile. Ensure appropriate clearance before adding payments or database roles!
          </p>
        </div>
      </div>
    </div>
  );
}


// ── Add User sub-form ──
function AddUserForm({ onSubmit }: { onSubmit: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Dispatcher");
  const [error, setError] = useState("");
  const mut = useMutation({
    mutationFn: (data: { name: string; email: string; role: string }) =>
      fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => { if (!r.ok) return r.json().then(d => { throw new Error(d.error); }); return r.json(); }),
    onSuccess: () => onSubmit(),
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="space-y-1"><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="space-y-1"><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="space-y-1">
        <Label>Role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{SYSTEM_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onSubmit}>Cancel</Button>
        <Button onClick={() => mut.mutate({ name, email, role })} disabled={mut.isPending || !name || !email}>
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          Add User
        </Button>
      </div>
    </div>
  );
}

// ── Edit User Dialog sub-component[cite: 7] ──
function EditUserDialog({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["user-edit", userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(r => r.json()),
    enabled: !!userId,
  });
  const u = userId ? (data?.user as { id: string; name: string; email: string; role: string; status: string }) : null;

  const qc = useQueryClient();
  const [error, setError] = useState("");
  const mut = useMutation({
    mutationFn: ({ id, name, role, status, newPassword }: { id: string; name: string; role: string; status: string; newPassword?: string }) =>
      fetch(`/api/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, role, status, newPassword }) }).then(r => { if (!r.ok) return r.json().then(d => { throw new Error(d.error); }); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users-admin"] }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  if (!userId) return null;

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : u ? (
          <EditUserForm key={u.id} user={u} userId={userId} onMutate={mut} error={error} onError={setError} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditUserForm({ user: u, userId, onMutate: mut, error, onError }: {
  user: { id: string; name: string; email: string; role: string; status: string };
  userId: string;
  onMutate: { mutate: (v: { id: string; name: string; role: string; status: string; newPassword?: string }) => void; isPending: boolean };
  error: string;
  onError: (e: string) => void;
}) {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "Super Admin";

  const [name, setName] = useState(u.name);
  const [role, setRole] = useState(u.role);
  const [status, setStatus] = useState(u.status);
  const [newPassword, setNewPassword] = useState("");

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Email</Label>
        <Input value={u.email} disabled className="bg-muted" />
      </div>
      <div className="space-y-1">
        <Label>Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{SYSTEM_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isSuperAdmin && (
        <div className="space-y-1 pt-3 border-t border-border mt-3">
          <Label className="text-red-500 font-semibold text-xs">ADMIN PASSWORD OVERRIDE</Label>
          <Input 
            type="text"
            placeholder="Enter new password to force reset"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground pt-1">
            Leave this blank unless you want to permanently overwrite this user's password.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={() => {}}>Cancel</Button>
        <Button size="sm" onClick={() => mut.mutate({ id: userId, name, role, status, newPassword })} disabled={mut.isPending || !name}>
          {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}