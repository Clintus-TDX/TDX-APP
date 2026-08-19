import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isSuperAdmin, logAudit, jsonError, jsonOk } from "@/lib/server";

export const dynamic = "force-dynamic";

// GET — list payments
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user)) return jsonError("Super Admin only", 403);
  const sp = req.nextUrl.searchParams;
  const invoiceId = sp.get("invoiceId") || "";
  const where: Record<string, unknown> = {};
  if (invoiceId) where.invoiceId = invoiceId;
  const payments = await db.payment.findMany({ where, orderBy: { createdAt: "desc" } });
  return jsonOk({ payments });
}

// POST — submit payment
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user)) return jsonError("Super Admin only", 403);
  let body: { invoiceId?: string; amount?: number; method?: string; status?: string; scheduledDate?: string; action?: string; ids?: string[] };
  try { body = await req.json(); } catch { return jsonError("Invalid body"); }

  if (body.action === "bulk") {
    // Bulk pay: pay pending invoices, with optional filter by ids
    const whereClause: Record<string, unknown> = { status: "Pending" };
    if (body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
      whereClause.id = { in: body.ids };
    }
    const pending = await db.invoice.findMany({ where: whereClause });
    const results: { invoiceId: string; paymentId: string }[] = [];
    for (const inv of pending) {
      const p = await db.payment.create({
        data: { invoiceId: inv.id, amount: inv.total, method: body.method || "Card", status: "Completed" },
      });
      await db.invoice.update({ where: { id: inv.id }, data: { status: "Paid" } });
      results.push({ invoiceId: inv.id, paymentId: p.id });
    }
    await logAudit({ user, action: "BULK_PAY", entity: "Payment", details: `Bulk paid ${results.length} invoices` });
    return jsonOk({ payments: results });
  }

  if (!body.invoiceId || !body.amount) return jsonError("invoiceId and amount required");
  const amount = Number(body.amount);
  if (isNaN(amount) || amount <= 0) return jsonError("Amount must be a positive number", 400);

  // Validate invoice exists
  const inv = await db.invoice.findUnique({ where: { id: body.invoiceId } });
  if (!inv) return jsonError("Invoice not found", 404);

  const payment = await db.payment.create({
    data: {
      invoiceId: body.invoiceId,
      amount,
      method: body.method || "Card",
      status: body.status || "Completed",
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
    },
  });
  if (payment.status === "Completed") {
    await db.invoice.update({ where: { id: body.invoiceId }, data: { status: "Paid" } });
  }
  await logAudit({ user, action: "CREATE", entity: "Payment", entityId: payment.id, details: `Payment of $${body.amount}` });
  return jsonOk({ payment });
}
