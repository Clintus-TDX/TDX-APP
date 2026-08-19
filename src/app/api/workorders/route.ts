import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission, logAudit } from "@/lib/server";
import { jsonError, jsonOk } from "@/lib/server-helpers";

export const dynamic = "force-dynamic";

// GET /api/workorders — list work orders with optional filters
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "view_dispatch")) return jsonError("Unauthorized", 401);

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(sp.get("pageSize") || "10", 10)));
  const search = sp.get("search")?.trim() || "";
  const statusFilter = sp.get("status") || "";
  const clientFilter = sp.get("client") || "";
  const platformFilter = sp.get("platform") || "";
  const engineerFilter = sp.get("engineer") || "";
  const sortCol = sp.get("sort") || "dateCreated";
  const sortDir = sp.get("dir") || "desc";
  const dueDate = sp.get("dueDate") || "";

  const where: Record<string, unknown> = {};
  if (dueDate) {
    // Parse in local timezone to match SQLite storage
    const parts = dueDate.split("-").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const start = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
      const end = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        where.etaDlaDate = { gte: start, lte: end };
      }
    }
  }
  if (statusFilter) where.status = statusFilter;
  if (clientFilter) where.clientId = clientFilter;
  if (platformFilter) where.jobPlatformId = platformFilter;
  if (engineerFilter) where.fieldEngineerId = engineerFilter;
  if (search) {
    (where as Record<string, unknown>).OR = [
      { ticketId: { contains: search } },
      { clientName: { contains: search } },
      { fieldEngineerName: { contains: search } },
      { siteLocation: { contains: search } },
      { comments: { contains: search } },
      { customerReferences: { contains: search } },
    ];
  }

  const orderBy: Record<string, string> = {};
  orderBy[sortCol] = sortDir.toLowerCase() === "asc" ? "asc" : "desc";

  try {
    const [total, rows] = await Promise.all([
      db.workOrder.count({ where }),
      db.workOrder.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          ticketId: true,
          clientId: true,
          clientName: true,
          jobPlatformId: true,
          jobPlatformName: true,
          status: true,
          customerReferences: true,
          siteLocation: true,
          payRatePrimary: true,
          payRateSecondary: true,
          fieldEngineerId: true,
          fieldEngineerName: true,
          hours: true,
          expenses: true,
          incurredExpenses: true,
          hourlyRate: true,
          comments: true,
          notes: true,
          dateCreated: true,
          dateModified: true,
          // Extended fields
          streetAddress: true,
          city: true,
          state: true,
          zipCode: true,
          country: true,
          pickupSiteNotes: true,
          deliverySiteNotes: true,
          etaDlaDate: true,
          salesOrder: true,
          taskNumber: true,
          serialNumber: true,
          toxCode: true,
          engineerPhone: true,
          engineerContactAlt: true,
          engineerEmail: true,
          workedStartTime: true,
          workedEndTime: true,
          authorizedExpenses: true,
          billRate: true,
          flatRate: true,
          editManually: true,
          approveStatusSigner: true,
          _count: { select: { attachments: true } },
        },
      }),
    ]);

    return jsonOk({
      rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (e: any) {
    return jsonError(e.message || "Failed to fetch work orders");
  }
}

// POST /api/workorders — create new work order
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "create_workorder")) return jsonError("Unauthorized", 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }

  // Validate required fields (Notice Field Engineer is intentionally omitted here to make it optional)
  const clientName = (body.clientName as string) || "";
  const jobPlatformName = (body.jobPlatformName as string) || "";
  if (!clientName) return jsonError("Client name is required", 400);
  if (!jobPlatformName) return jsonError("Job platform is required", 400);

  const ticketId = (body.ticketId as string) || `TA-${Date.now()}`;
  const clientId = (body.clientId as string) || null;
  const jobPlatformId = (body.jobPlatformId as string) || null;

  try {
    const wo = await db.workOrder.create({
      data: {
        ticketId,
        clientId,
        clientName,
        jobPlatformId,
        jobPlatformName,
        status: (body.status as string) || "open-pending",
        customerReferences: (body.customerReferences as string) || "",
        siteLocation: (body.siteLocation as string) || "",
        payRatePrimary: (body.payRatePrimary as string) || "",
        payRateSecondary: (body.payRateSecondary as string) || "",
        // Safely map missing/empty engineers to null/empty string
        fieldEngineerId: (body.fieldEngineerId as string) || null,
        fieldEngineerName: (body.fieldEngineerName as string) || "",
        hours: Number(body.hours) || 0,
        expenses: Number(body.expenses) || 0,
        incurredExpenses: Number(body.incurredExpenses) || 0,
        hourlyRate: Number(body.hourlyRate) || 0,
        comments: (body.comments as string) || "",
        notes: "[]",
        // Extended fields
        streetAddress: (body.streetAddress as string) || "",
        city: (body.city as string) || "",
        state: (body.state as string) || "",
        zipCode: (body.zipCode as string) || "",
        country: (body.country as string) || "USA",
        pickupSiteNotes: (body.pickupSiteNotes as string) || "",
        deliverySiteNotes: (body.deliverySiteNotes as string) || "",
        etaDlaDate: body.etaDlaDate ? new Date(body.etaDlaDate as string) : null,
        salesOrder: (body.salesOrder as string) || "",
        taskNumber: (body.taskNumber as string) || "",
        serialNumber: (body.serialNumber as string) || "",
        toxCode: (body.toxCode as string) || "",
        engineerPhone: (body.engineerPhone as string) || "",
        engineerContactAlt: (body.engineerContactAlt as string) || "",
        engineerEmail: (body.engineerEmail as string) || "",
        workedStartTime: body.workedStartTime ? new Date(body.workedStartTime as string) : null,
        workedEndTime: body.workedEndTime ? new Date(body.workedEndTime as string) : null,
        authorizedExpenses: Number(body.authorizedExpenses) || 0,
        billRate: Number(body.billRate) || 0,
        flatRate: Number(body.flatRate) || 0,
        editManually: Boolean(body.editManually),
        approveStatusSigner: (body.approveStatusSigner as string) || "",
      },
    });

    await logAudit({
      user,
      action: "CREATE",
      entity: "WorkOrder",
      entityId: wo.id,
      details: `Created work order ${wo.ticketId}`,
    });

    return jsonOk({ workOrder: wo });
  } catch (e: any) {
    return jsonError(e.message || "Failed to create work order");
  }
}