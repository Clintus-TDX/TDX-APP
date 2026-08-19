import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission, logAudit, jsonError, jsonOk } from "@/lib/server";

export const dynamic = "force-dynamic";

/** Generate an invoice number in the format INV-{YEAR}-TKT-{WO_ID_SUFFIX} */
function generateInvoiceNumber(workOrders: { ticketId: string }[]): string {
  const year = new Date().getFullYear();
  if (workOrders.length > 0 && workOrders[0].ticketId) {
    const ticketId = workOrders[0].ticketId;
    const match = ticketId.match(/\d{4,}$/);
    const suffix = match ? match[0] : ticketId.replace(/\D/g, "").slice(-5);
    return `INV-${year}-TKT-${suffix}`;
  }
  return `INV-${year}-TKT-${Date.now().toString().slice(-5)}`;
}

// GET /api/invoices — list invoices with filters
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "view_invoices")) return jsonError("Unauthorized", 401);

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || "";
  const clientId = sp.get("clientId") || "";
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(sp.get("pageSize") || "25", 10)));

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;

  const [total, invoices] = await Promise.all([
    db.invoice.count({ where }),
    db.invoice.findMany({
      where,
      orderBy: { issueDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const [draftCount, pendingCount, paidCount, overdueCount] = await Promise.all([
    db.invoice.count({ where: { status: "Draft" } }),
    db.invoice.count({ where: { status: "Pending" } }),
    db.invoice.count({ where: { status: "Paid" } }),
    db.invoice.count({ where: { status: "Overdue" } }),
  ]);
  const totals = await db.invoice.aggregate({ _sum: { total: true } });
  const draftTotals = await db.invoice.aggregate({ where: { status: "Draft" }, _sum: { total: true } });
  const pendingTotals = await db.invoice.aggregate({ where: { status: "Pending" }, _sum: { total: true } });
  const paidTotals = await db.invoice.aggregate({ where: { status: "Paid" }, _sum: { total: true } });
  const overdueTotals = await db.invoice.aggregate({ where: { status: "Overdue" }, _sum: { total: true } });

  return jsonOk({
    invoices,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    summary: {
      total: totals._sum.total || 0,
      draft: { count: draftCount, total: draftTotals._sum.total || 0 },
      pending: { count: pendingCount, total: pendingTotals._sum.total || 0 },
      paid: { count: paidCount, total: paidTotals._sum.total || 0 },
      overdue: { count: overdueCount, total: overdueTotals._sum.total || 0 },
    },
  });
}

// POST /api/invoices — create invoice from work orders
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "create_invoice")) return jsonError("Unauthorized", 401);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonError("Invalid body"); }

  // Parse workOrderIds — could be a string (JSON) or already an array from JSON body
  let workOrderIds: string[] = [];
  const rawWOIds = body.workOrderIds;
  if (Array.isArray(rawWOIds)) {
    workOrderIds = rawWOIds.filter((id: unknown) => typeof id === "string");
  } else if (typeof rawWOIds === "string") {
    try { workOrderIds = JSON.parse(rawWOIds); } catch { workOrderIds = []; }
  }
  if (workOrderIds.length === 0) return jsonError("No work orders selected", 400);

  // Fetch work orders with their client and engineer relations
  const workOrders = await db.workOrder.findMany({
    where: { id: { in: workOrderIds } },
    include: { client: true, fieldEngineer: true },
  });

  if (workOrders.length === 0) return jsonError("No valid work orders found", 400);

  // Determine primary client info from the first work order
  const primaryWO = workOrders[0];
  const primaryClient = primaryWO.client;
  const primaryEngineer = primaryWO.fieldEngineer;

  // Build bill-to address from client data
  const billToName = primaryWO.clientName || primaryClient?.name || "";
  const billToAddress = primaryClient?.address || "";

  // Build line items from work order data
  let subtotal = 0;
  const lineItems: { description: string; quantity: number; rate: number; amount: number }[] = [];
  for (const wo of workOrders) {
    const rate = wo.billRate > 0 ? wo.billRate : wo.hourlyRate;
    const laborAmount = wo.hours * rate;
    lineItems.push({
      description: `Labor – ${wo.ticketId} (${wo.hours} hrs @ $${rate.toFixed(2)}/hr)`,
      quantity: wo.hours,
      rate,
      amount: laborAmount,
    });
    if (wo.expenses > 0) {
      lineItems.push({
        description: `Technician Expenses – ${wo.ticketId}`,
        quantity: 1,
        rate: wo.expenses,
        amount: wo.expenses,
      });
    }
    if (wo.incurredExpenses > 0) {
      lineItems.push({
        description: `Incurred Expenses – ${wo.ticketId}`,
        quantity: 1,
        rate: wo.incurredExpenses,
        amount: wo.incurredExpenses,
      });
    }
    subtotal += laborAmount + wo.expenses + wo.incurredExpenses;
  }

  const taxRate = Number(body.taxRate) || 0;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const invoiceNumber = (body.invoiceNumber as string) || generateInvoiceNumber(workOrders);

  const invoice = await db.invoice.create({
    data: {
      invoiceNumber,
      clientId: primaryWO.clientId || null,
      clientName: (body.clientName as string) || billToName,
      workOrderIds: JSON.stringify(workOrderIds),
      vendorName: (body.vendorName as string) || "Techadox",
      vendorAddress: (body.vendorAddress as string) || "261 Chapman Road, Suite 104 A, Newark, DE 19702",
      vendorTaxId: (body.vendorTaxId as string) || "TX-882-4490",
      billToName: (body.billToName as string) || billToName,
      billToAddress: (body.billToAddress as string) || billToAddress,
      lineItems: JSON.stringify(lineItems),
      taxRate,
      notes: (body.notes as string) || "Payment due within 30 days.",
      signature: (body.signature as string) || "",
      status: (body.status as string) || "Draft",
      dueDate: body.dueDate ? new Date(body.dueDate as string) : new Date(Date.now() + 30 * 86400000),
      subtotal,
      tax,
      total,
      jobPlatformName: primaryWO.jobPlatformName || "",
      payRatePrimary: primaryWO.payRatePrimary || "",
      payRateSecondary: primaryWO.payRateSecondary || "",
      fieldEngineerName: primaryWO.fieldEngineerName || "",
    },
  });

  await logAudit({ user, action: "CREATE", entity: "Invoice", entityId: invoice.id, details: `Created invoice ${invoiceNumber} from ${workOrders.length} work order(s)` });
  return jsonOk({ invoice });
}
