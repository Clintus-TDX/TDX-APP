import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/server";
import { jsonError, jsonOk } from "@/lib/server-helpers";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "view_dispatch")) {
    return jsonError("Unauthorized", 401);
  }

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") || "";

  // Safely parse integers to prevent NaN crashes
  const parsedPage = parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const parsedPageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const pageSize = Number.isFinite(parsedPageSize) 
    ? Math.min(50, Math.max(1, parsedPageSize)) 
    : 20;

  try {
    let where: Prisma.WorkOrderWhereInput = {};
    let orderBy: Prisma.WorkOrderOrderByWithRelationInput = { dateCreated: "desc" };
    let title = "Tickets";

    switch (type) {
      case "totalTickets":
        title = "All Tickets";
        break;

      case "openPending":
        where = { ...where, status: { in: ["open-pending", "open-not-posted"] } };
        title = "Open / Pending Tickets";
        break;

      case "actionRequired":
        where = { ...where, status: "action-required" };
        title = "Action Required Tickets";
        break;

      case "completed":
        where = { ...where, status: "ticket-completed" };
        title = "Completed Tickets";
        break;

      case "inBilling":
        where = { ...where, status: "in-process-billing" };
        title = "In Process of Billing";
        break;

      case "cancelled":
        where = { ...where, status: "cancelled" };
        title = "Cancelled Tickets";
        break;

      case "techCancelled":
        where = { ...where, status: "tech-cancelled" };
        title = "Tech Cancelled / Abandoned";
        break;

      case "totalHours":
        where = { ...where, hours: { gt: 0 } };
        orderBy = { hours: "desc" };
        title = "Tickets by Hours (Highest First)";
        break;

      case "revenue":
        orderBy = { billRate: "desc" };
        title = "Est. Revenue (Highest Bill Rate First)";
        break;

      case "payroll":
        orderBy = { hourlyRate: "desc" };
        title = "Payroll (Est.) (Highest Pay Rate First)";
        break;

      case "expenses":
        where = {
          ...where,
          OR: [{ expenses: { gt: 0 } }, { incurredExpenses: { gt: 0 } }],
        };
        orderBy = { expenses: "desc" };
        title = "Tickets with Expenses";
        break;

      case "netMargin":
        where = {
          ...where,
          OR: [{ billRate: { gt: 0 } }, { hourlyRate: { gt: 0 } }],
        };
        orderBy = { billRate: "desc" };
        title = "Tickets by Margin";
        break;

      default:
        return jsonError("Invalid type", 400);
    }

    const [tickets, total] = await Promise.all([
      db.workOrder.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          ticketId: true,
          clientName: true,
          status: true,
          fieldEngineerName: true,
          hours: true,
          expenses: true,
          incurredExpenses: true,
          hourlyRate: true,
          billRate: true,
          siteLocation: true,
          dateCreated: true,
          etaDlaDate: true,
          // Replaced the invalid fields below:
          notes: true, 
          jobPlatformName: true, 
        },
      }),
      db.workOrder.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return jsonOk({
      title,
      tickets,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (e: any) {
    // ADD THIS LINE:
    console.error("PRISMA ERROR DETAILS:", e); 
    
    return jsonError(e.message || "Failed to fetch details", 500);
  }
}