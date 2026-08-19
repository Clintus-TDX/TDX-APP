"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  Printer,
  Columns3,
  Calendar,
  Loader2,
  RotateCcw,
  Filter,
  Building2,
  UserCheck,
} from "lucide-react";
import { REPORT_COLUMN_OPTIONS, DEFAULT_REPORT_COLUMNS } from "@/lib/constants";

interface ReportRow {
  id: string;
  ticketId: string;
  clientName: string;
  status: string;
  jobPlatformName: string;
  siteLocation: string;
  fieldEngineerName: string;
  payRatePrimary: string;
  payRateSecondary: string;
  hours: number;
  expenses: number;
  incurredExpenses: number;
  hourlyRate: number;
  dateCreated: string;
  dateModified: string;
  customerReferences: string;
  comments: string;
}

export function ReportsView() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [engineerFilter, setEngineerFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedCols, setSelectedCols] = useState<string[]>(DEFAULT_REPORT_COLUMNS);
  const [showColPicker, setShowColPicker] = useState(false);

  // Fetch lookups
  const { data: clientsData } = useQuery({ queryKey: ["clients"], queryFn: () => fetch("/api/clients").then(r => r.json()) });
  const { data: engineersData } = useQuery({ queryKey: ["engineers"], queryFn: () => fetch("/api/engineers").then(r => r.json()) });

  // Fetch report data
  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    if (clientFilter && clientFilter !== "all") p.set("clientIds", clientFilter);
    if (engineerFilter && engineerFilter !== "all") p.set("engineerIds", engineerFilter);
    if (search) p.set("search", search);
    return p.toString();
  }, [startDate, endDate, clientFilter, engineerFilter, search]);

  const { data, isLoading } = useQuery<{ rows: ReportRow[]; total: number }>({
    queryKey: ["report", params],
    queryFn: () => fetch(`/api/reports?${params}`).then(r => r.json()),
    enabled: true,
  });

  const rows = data?.rows || [];
  const colDefs = REPORT_COLUMN_OPTIONS.filter(c => selectedCols.includes(c.key));

  const toggleCol = (key: string) => {
    setSelectedCols(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]);
  };

  const exportStdXLSX = async () => {
    const p = new URLSearchParams(params);
    p.set("format", "stdxlsx");
    const res = await fetch(`/api/reports?${p}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `techadox-report-${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setClientFilter("all");
    setEngineerFilter("all");
    setSearch("");
  };

  const hasActiveFilters = startDate || endDate || clientFilter !== "all" || engineerFilter !== "all" || search;

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }); } catch { return d; }
  };

  const getCell = (row: ReportRow, key: string) => {
    if (key === "hours") return row.hours.toFixed(1);
    if (key === "expenses" || key === "incurredExpenses" || key === "hourlyRate") return `$${Number(row[key as keyof ReportRow] as number).toFixed(2)}`;
    if (key === "dateCreated" || key === "dateModified") return fmtDate(row[key as keyof ReportRow] as string);
    return String(row[key as keyof ReportRow] || "");
  };

  const clients = (clientsData?.clients as { id: string; name: string }[]) || [];
  const engineers = (engineersData?.engineers as { id: string; name: string }[]) || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <div className="h-6 w-1.5 rounded brand-gradient" />
          Reports
        </h2>
        <Badge variant="secondary" className="text-xs">
          {rows.length} result{rows.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search row */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ticket ID, client, location, engineer..."
              className="pl-9 h-10 w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Date range row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">Date Range:</span>
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="h-10 w-[160px]"
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="h-10 w-[160px]"
            />
          </div>

          <Separator />

          {/* Dropdown filters row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client filter */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                Client
              </label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Clients</SelectItem>
                  <ScrollArea className="max-h-[200px]">
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            {/* Engineer filter */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                <UserCheck className="h-3.5 w-3.5" />
                Field Engineer
              </label>
              <Select value={engineerFilter} onValueChange={setEngineerFilter}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="All Engineers" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Engineers</SelectItem>
                  <ScrollArea className="max-h-[200px]">
                    {engineers.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reset button */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={resetFilters} className="text-xs text-muted-foreground">
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={exportStdXLSX}>
          <Download className="h-4 w-4 mr-1.5" /> Export XLSX (Standard)
        </Button>
        <Button size="sm" variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1.5" /> Print
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowColPicker(!showColPicker)}>
          <Columns3 className="h-4 w-4 mr-1.5" /> Select Columns
        </Button>
      </div>

      {/* Column picker dropdown */}
      {showColPicker && (
        <Card className="p-4">
          <CardHeader className="p-0 pb-3 mb-0">
            <CardTitle className="text-sm font-medium">Select Output Columns</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-64">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {REPORT_COLUMN_OPTIONS.map(col => (
                  <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                    <Checkbox checked={selectedCols.includes(col.key)} onCheckedChange={() => toggleCol(col.key)} />
                    {col.label}
                  </label>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Report Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <ScrollArea className="max-h-[calc(100vh-520px)]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                {colDefs.map(col => (
                  <TableHead key={col.key} className="text-xs font-semibold uppercase tracking-wider h-9 px-3 whitespace-nowrap">
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={colDefs.length} className="h-24 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={colDefs.length} className="h-24 text-center text-muted-foreground">No results found.</TableCell></TableRow>
              ) : (
                rows.map(row => (
                  <TableRow key={row.id} className="hover:bg-muted/30">
                    {colDefs.map(col => (
                      <TableCell key={col.key} className="px-3 py-2 text-sm">
                        {col.key === "status" ? <StatusBadge statusKey={row.status} size="sm" /> : getCell(row, col.key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
