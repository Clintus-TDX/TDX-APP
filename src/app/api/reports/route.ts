import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission, toCSV, formatDateShort } from "@/lib/server";
import { DASHBOARD_COLUMNS, STATUS_MAP } from "@/lib/constants";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

/* ─── Shared style constants (matching format.xlsx exactly) ─── */

// Row 1: Category group headers
const GOLD = "FFC000";       // Geodis Reference (A1)
const BRAND_RED = "FF3200E6"; // Shipment Information / Shipment charges / Ad hoc reference

// Row 2: Column headers
const HEADER_GRAY = "FFA5A5A5";  // Shipment info cols
const HEADER_TEAL = "FF7DCDB4";  // Shipment charges cols

// Data rows
const WHITE = "FFFFFFFF";
const LIGHT_GOLD = "FFFFF2CC";
const LIGHT_GRAY = "FFD9D9D9";  // Total Invoice column (P)

const FONT_CALIBRI = "Calibri";
const FONT_SIZE = 11;
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF000000" } },
  left: { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  right: { style: "thin", color: { argb: "FF000000" } },
};

function applyStyle(cell: ExcelJS.Cell, opts: {
  font?: Partial<ExcelJS.Font>;
  fill?: string; // argb hex
  alignment?: Partial<ExcelJS.Alignment>;
  border?: Partial<ExcelJS.Borders>;
  numFmt?: string;
}) {
  if (opts.font) cell.font = { ...cell.font, ...opts.font } as Partial<ExcelJS.Font>;
  if (opts.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fill } };
  if (opts.alignment) cell.alignment = { ...cell.alignment, ...opts.alignment } as Partial<ExcelJS.Alignment>;
  if (opts.border) cell.border = opts.border;
  if (opts.numFmt) cell.numFmt = opts.numFmt;
}

/** Convert a CSS hex color (#RRGGBB) to Excel ARGB format (FFRRGGBB) */
function toArgb(hex: string): string {
  const h = hex.replace("#", "");
  return `FF${h.toUpperCase()}`;
}

/** Get the status-based fill color for a data row */
function getStatusFill(status: string): string {
  const def = STATUS_MAP[status];
  if (def?.bg) return toArgb(def.bg);
  return WHITE;
}

/* ─── Standard Report XLSX — exact format.xlsx layout with status-based colors ─── */
async function generateStandardXLSX(rows: any[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Report");

  // Column definitions matching format.xlsx widths exactly
  ws.columns = DASHBOARD_COLUMNS.map((c, i) => {
    const widths = [17.29, 19.14, 23.71, 10.14, 10.43, 9.86, 11.29, 12.14, 11.43, 9.57, 7.29, 8.43, 14, 18.86, 14, 13.43, 82.57];
    return { width: widths[i] || 15 };
  });

  // ─── Row 1: Category group headers (merged) ───
  const row1 = ws.addRow([
    "Geodis Reference",
    "Shipment Information", "", "", "", "", "", "", "", "",
    "Shipment charges", "", "", "", "", "",
    "Ad hoc reference",
  ]);

  // Merge cells matching format.xlsx: B1:H1, K1:P1
  ws.mergeCells("B1:H1");
  ws.mergeCells("K1:P1");

  // Style Row 1
  row1.eachCell((cell, colNumber) => {
    const isGold = colNumber === 1;  // A1: Geodis Reference
    const isBrand = colNumber >= 2; // B1–Q1: Shipment Information / Shipment charges / Ad hoc reference
    applyStyle(cell, {
      font: { name: FONT_CALIBRI, size: FONT_SIZE, bold: true, color: { argb: "FFFFFFFF" } },
      fill: isGold ? GOLD : BRAND_RED,
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: THIN_BORDER,
    });
  });
  row1.height = 30;

  // ─── Row 2: Column headers ───
  const row2 = ws.addRow(DASHBOARD_COLUMNS.map(c => c.label));

  row2.eachCell((cell, colNumber) => {
    // Columns K–P (indices 11–16) = Shipment charges → teal
    const isCharge = colNumber >= 11 && colNumber <= 16;
    applyStyle(cell, {
      font: { name: FONT_CALIBRI, size: FONT_SIZE, bold: true, color: { argb: "FFFFFFFF" } },
      fill: isCharge ? HEADER_TEAL : HEADER_GRAY,
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: THIN_BORDER,
    });
  });
  row2.height = 45;

  // ─── Data rows — colored by ticket status ───
  rows.forEach((r) => {
    const hours = Number(r.hours) || 0;
    const hourlyRate = Number(r.hourlyRate) || 0;
    const expenses = Number(r.expenses) || 0;
    const totalAmount = hours * hourlyRate;
    const totalWithExpenses = totalAmount + expenses;

    const getVal = (source: string) => {
      if (source === "computed_hours_x_rate") return totalAmount;
      if (source === "computed_total_with_expenses") return totalWithExpenses;
      const val = (r as any)[source];
      if (val === null || val === undefined) return "";
      if (source === "dateCreated" || source === "etaDlaDate" || source === "workedEndTime") {
        if (val instanceof Date) return val;
        return new Date(val);
      }
      return val;
    };

    const dataRow = ws.addRow(DASHBOARD_COLUMNS.map(c => getVal(c.source)));

    // Status-based row fill color
    const statusFill = getStatusFill(r.status);

    dataRow.eachCell((cell, colNumber) => {
      // Column P (index 16) = Total Invoice → light gray overlay always
      const isTotalInvoiceCol = colNumber === 16;
      const rowFill = isTotalInvoiceCol ? LIGHT_GRAY : statusFill;

      // Number formats for financial columns: L, M, O, P (indices 12, 13, 15, 16)
      let numFmt: string | undefined;
      if ([12, 13, 15, 16].includes(colNumber)) {
        numFmt = '_("$"* #,##0.00_);_("$"* \\(#,##0.00\\);_("$"* "-"??_);_(@_)';
      }
      // Date formats for G, H, I (indices 7, 8, 9)
      if ([7, 8, 9].includes(colNumber)) {
        numFmt = "mm-dd-yy";
      }

      applyStyle(cell, {
        font: { name: FONT_CALIBRI, size: FONT_SIZE },
        fill: rowFill,
        alignment: { horizontal: "center", vertical: "middle" },
        border: THIN_BORDER,
        numFmt,
      });
    });
  });

  // ─── Totals row ───
  const totalsData: (string | number)[] = DASHBOARD_COLUMNS.map((c, colIdx) => {
    if (c.source === "hours") {
      return rows.reduce((acc, r) => acc + (Number(r.hours) || 0), 0);
    }
    if (c.source === "hourlyRate" || c.source === "expenses") {
      return rows.reduce((acc, r) => acc + (Number((r as any)[c.source]) || 0), 0);
    }
    if (c.source === "computed_hours_x_rate") {
      return rows.reduce((acc, r) => acc + (Number(r.hours) || 0) * (Number(r.hourlyRate) || 0), 0);
    }
    if (c.source === "computed_total_with_expenses") {
      return rows.reduce((acc, r) => {
        const h = Number(r.hours) || 0;
        const rate = Number(r.hourlyRate) || 0;
        const exp = Number(r.expenses) || 0;
        return acc + (h * rate) + exp;
      }, 0);
    }
    return colIdx === 0 ? "Total" : "";
  });

  const totalRow = ws.addRow(totalsData);
  totalRow.eachCell((cell, colNumber) => {
    let numFmt: string | undefined;
    if ([12, 13, 15, 16].includes(colNumber)) {
      numFmt = '_("$"* #,##0.00_);_("$"* \\(#,##0.00\\);_("$"* "-"??_);_(@_)';
    }
    applyStyle(cell, {
      font: { name: FONT_CALIBRI, size: FONT_SIZE, bold: true },
      fill: WHITE,
      alignment: { horizontal: "center", vertical: "middle" },
      border: THIN_BORDER,
      numFmt,
    });
  });

  // Freeze panes at A3 (rows 1-2 frozen) — matching format.xlsx
  ws.views = [{ state: "frozen", ySplit: 2, xSplit: 0, topLeftCell: "A3", activeCell: "A3" }];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/* ─── GET handler ─── */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "view_reports")) return jsonError("Unauthorized", 401);

  const sp = req.nextUrl.searchParams;
  const startDate = sp.get("startDate");
  const endDate = sp.get("endDate");
  const clientIds = sp.get("clientIds")?.split(",").filter(Boolean) || [];
  const engineerIds = sp.get("engineerIds")?.split(",").filter(Boolean) || [];
  const search = sp.get("search")?.trim() || "";
  const format = sp.get("format") || "json"; // json | csv | xlsx | stdxlsx

  const where: Record<string, unknown> = {};
  if (startDate) where.dateCreated = { ...((where.dateCreated as any) || {}), gte: new Date(startDate) };
  if (endDate) where.dateCreated = { ...((where.dateCreated as any) || {}), lte: new Date(endDate) };
  if (clientIds.length) where.clientId = { in: clientIds };
  if (engineerIds.length) where.fieldEngineerId = { in: engineerIds };
  if (search) {
    (where as any).OR = [
      { ticketId: { contains: search } },
      { clientName: { contains: search } },
      { fieldEngineerName: { contains: search } },
    ];
  }

  const rows = await db.workOrder.findMany({
    where,
    orderBy: { dateCreated: "desc" },
  });

  if (format === "csv") {
    const columns = [
      { key: "ticketId", label: "Ticket ID" },
      { key: "clientName", label: "Client" },
      { key: "status", label: "Status" },
      { key: "fieldEngineerName", label: "Field Engineer" },
      { key: "hours", label: "Hours" },
      { key: "expenses", label: "Expenses" },
      { key: "dateCreated", label: "Date Created" },
    ];
    const csvData = rows.map((r) => ({
      ...r,
      dateCreated: formatDateShort(r.dateCreated),
    }));
    const csv = toCSV(csvData as any, columns);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="report_${Date.now()}.csv"`,
      },
    });
  }

  if (format === "xlsx") {
    // Dashboard format (same as stdxlsx now)
    const buf = await generateStandardXLSX(rows);
    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="techadox-dashboard-report_${Date.now()}.xlsx"`,
      },
    });
  }

  if (format === "stdxlsx") {
    // Standard report — exact format.xlsx layout with status-based row colors
    const buf = await generateStandardXLSX(rows);
    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="techadox-report_${Date.now()}.xlsx"`,
      },
    });
  }

  return jsonOk({ rows, total: rows.length });
}
