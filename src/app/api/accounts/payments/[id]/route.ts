import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isSuperAdmin, logAudit, jsonError, jsonOk } from "@/lib/server";

export const dynamic = "force-dynamic";

// PUT — update payment (cancel, change status)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user)) return jsonError("Super Admin only", 403);
  const { id } = await params;
  let body: { status?: string };
  try { body = await req.json(); } catch { return jsonError("Invalid body"); }
  const existing = await db.payment.findUnique({ where: { id } });
  if (!existing) return jsonError("Not found", 404);

  const payment = await db.payment.update({ where: { id }, data: { status: body.status || existing.status } });
  if (body.status === "Cancelled" || body.status === "Scheduled" || body.status === "Pending") {
    // Check if invoice still has other completed payments
    const remaining = await db.payment.findMany({ where: { invoiceId: existing.invoiceId, status: "Completed", id: { not: id } } });
    if (remaining.length === 0) {
      await db.invoice.update({ where: { id: existing.invoiceId }, data: { status: "Pending" } });
    }
  }
  await logAudit({ user, action: "UPDATE", entity: "Payment", entityId: id, details: `Payment status: ${body.status}` });
  return jsonOk({ payment });
}

// DELETE
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user)) return jsonError("Super Admin only", 403);
  const { id } = await params;
  const existing = await db.payment.findUnique({ where: { id } });
  if (!existing) return jsonError("Not found", 404);
  await db.payment.delete({ where: { id } });
  // Check remaining payments and update invoice status if needed
  const remaining = await db.payment.findMany({ where: { invoiceId: existing.invoiceId, status: "Completed" } });
  if (remaining.length === 0) {
    await db.invoice.update({ where: { id: existing.invoiceId }, data: { status: "Pending" } });
  }
  return jsonOk({ ok: true });
}
