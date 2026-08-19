import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission, logAudit } from "@/lib/server";
import { jsonError, jsonOk } from "@/lib/server-helpers";

export const dynamic = "force-dynamic";

// GET /api/workorders/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "view_dispatch")) return jsonError("Unauthorized", 401);
  const { id } = await params;

  try {
    const wo = await db.workOrder.findUnique({
      where: { id },
      include: {
        attachments: { orderBy: { order: "asc" } },
      },
    });
    if (!wo) return jsonError("Not found", 404);
    return jsonOk({ workOrder: wo });
  } catch (e: any) {
    return jsonError(e.message || "Failed to fetch work order", 500);
  }
}

// PUT /api/workorders/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "edit_workorder")) return jsonError("Unauthorized", 401);
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid body");
  }

  const existing = await db.workOrder.findUnique({ where: { id } });
  if (!existing) return jsonError("Not found", 404);

  const data: Record<string, unknown> = {};
  const updatable = [
    "ticketId", "clientName", "jobPlatformName",
    "status", "customerReferences", "siteLocation", "payRatePrimary", "payRateSecondary",
    "fieldEngineerName", "hours", "expenses", "incurredExpenses",
    "hourlyRate", "comments", "notes",
    // Extended fields
    "streetAddress", "city", "state", "zipCode", "country",
    "pickupSiteNotes", "deliverySiteNotes", "etaDlaDate",
    "salesOrder", "taskNumber", "serialNumber", "tdxCode",
    "engineerPhone", "engineerContactAlt", "engineerEmail",
    "workedStartTime", "workedEndTime",
    "authorizedExpenses", "billRate", "editManually", "approveStatusSigner",
  ];

  const numericFields = ["hours", "expenses", "incurredExpenses", "hourlyRate", "authorizedExpenses", "billRate"];
  const dateFields = ["workedStartTime", "workedEndTime", "etaDlaDate"];
  const booleanFields = ["editManually"];

  for (const key of updatable) {
    if (body[key] !== undefined) {
      if (numericFields.includes(key)) {
        (data as Record<string, unknown>)[key] = Number(body[key]) || 0;
      } else if (dateFields.includes(key)) {
        (data as Record<string, unknown>)[key] = body[key] ? new Date(body[key] as string) : null;
      } else if (booleanFields.includes(key)) {
        (data as Record<string, unknown>)[key] = Boolean(body[key]);
      } else {
        (data as Record<string, unknown>)[key] = body[key];
      }
    }
  }

  // Safely handle relations if IDs are provided
  if (body.clientId !== undefined) {
    data.client = body.clientId ? { connect: { id: body.clientId as string } } : { disconnect: true };
  }
  if (body.jobPlatformId !== undefined) {
    data.jobPlatform = body.jobPlatformId ? { connect: { id: body.jobPlatformId as string } } : { disconnect: true };
  }
  if (body.fieldEngineerId !== undefined) {
    data.fieldEngineer = body.fieldEngineerId ? { connect: { id: body.fieldEngineerId as string } } : { disconnect: true };
  }

  data.dateModified = new Date();

  try {
    const wo = await db.workOrder.update({ where: { id }, data });
    await logAudit({
      user,
      action: "UPDATE",
      entity: "WorkOrder",
      entityId: id,
      details: `Updated work order ${wo.ticketId}`,
    });
    return jsonOk({ workOrder: wo });
  } catch (e: any) {
    return jsonError(e.message || "Update failed");
  }
}

// DELETE /api/workorders/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "delete_workorder")) return jsonError("Unauthorized", 401);
  const { id } = await params;

  const existing = await db.workOrder.findUnique({ where: { id } });
  if (!existing) return jsonError("Not found", 404);

  await db.attachment.deleteMany({ where: { workOrderId: id } });
  await db.workOrder.delete({ where: { id } });

  await logAudit({
    user,
    action: "DELETE",
    entity: "WorkOrder",
    entityId: id,
    details: `Deleted work order ${existing.ticketId}`,
  });

  return jsonOk({ ok: true });
}