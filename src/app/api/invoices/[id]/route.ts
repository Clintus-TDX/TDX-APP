import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission, logAudit, safeParse, jsonError, jsonOk } from "@/lib/server";

export const dynamic = "force-dynamic";

// GET /api/invoices/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "view_invoices")) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const inv = await db.invoice.findUnique({ where: { id }, include: { payments: true } });
  if (!inv) return jsonError("Not found", 404);
  return jsonOk({ invoice: inv });
}

// PUT /api/invoices/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "create_invoice")) return jsonError("Unauthorized", 401);
  const { id } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonError("Invalid body"); }

  const existing = await db.invoice.findUnique({ where: { id } });
  if (!existing) return jsonError("Not found", 404);

  const data: Record<string, unknown> = {};
  const fields = [
    "invoiceNumber", "clientName", "billToName", "billToAddress",
    "vendorName", "vendorAddress", "vendorTaxId", "notes", "signature",
    "status", "lineItems", "taxRate",
  ];
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = typeof body[f] === "object" ? JSON.stringify(body[f]) : body[f];
  }
  if (body.dueDate) {
    const d = new Date(body.dueDate as string);
    if (!isNaN(d.getTime())) data.dueDate = d;
  }

  // Recalculate subtotal/tax/total if lineItems changed
  if (body.lineItems) {
    const items: any[] = safeParse(body.lineItems as string | null | undefined, []);
    const sub = items.reduce((a: number, i: any) => a + (i.amount || 0), 0);
    const taxRate = Number(body.taxRate ?? existing.taxRate) || 0;
    data.subtotal = sub;
    data.tax = sub * taxRate;
    data.total = sub + sub * taxRate;
  }

  const inv = await db.invoice.update({ where: { id }, data });
  await logAudit({ user, action: "UPDATE", entity: "Invoice", entityId: id, details: `Updated invoice ${inv.invoiceNumber}` });
  return jsonOk({ invoice: inv });
}

// DELETE /api/invoices/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "delete_invoice")) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const existing = await db.invoice.findUnique({ where: { id } });
  if (!existing) return jsonError("Not found", 404);
  await db.payment.deleteMany({ where: { invoiceId: id } });
  await db.invoice.delete({ where: { id } });
  await logAudit({ user, action: "DELETE", entity: "Invoice", entityId: id, details: `Deleted invoice ${existing.invoiceNumber}` });
  return jsonOk({ ok: true });
}
