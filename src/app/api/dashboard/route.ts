import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/server";
import { jsonError, jsonOk } from "@/lib/server-helpers";

export const dynamic = "force-dynamic";

// GET /api/dashboard — aggregated dashboard stats
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "view_dispatch")) return jsonError("Unauthorized", 401);

  const sp = req.nextUrl.searchParams;
  const upcomingDays = Math.max(1, Math.min(30, parseInt(sp.get("days") || "7", 10)));

  try {
    // Run all queries in parallel
    const [
      totalTickets,
      statusCounts,
      recentTickets,
      topClients,
      topEngineers,
      upcomingDue,
      financials,
    ] = await Promise.all([

      // 1. Total count
      db.workOrder.count(),

      // 2. Status distribution
      db.workOrder.groupBy({
        by: ["status"],
        _count: { id: true },
      }),

      // 3. Recent 8 tickets
      db.workOrder.findMany({
        orderBy: { dateCreated: "desc" },
        take: 8,
        select: {
          id: true, ticketId: true, clientName: true, status: true,
          fieldEngineerName: true, hours: true, siteLocation: true,
          dateCreated: true, etaDlaDate: true,
        },
      }),

      // 4. Top 5 clients by ticket count
      db.workOrder.groupBy({
        by: ["clientName"],
        _count: { id: true },
        _sum: { hours: true, expenses: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
        where: { clientName: { not: "" } },
      }),

      // 5. Top 5 engineers by hours
      db.workOrder.groupBy({
        by: ["fieldEngineerName"],
        _count: { id: true },
        _sum: { hours: true },
        orderBy: { _sum: { hours: "desc" } },
        take: 5,
        where: { fieldEngineerName: { not: "" } },
      }),

      // 6. Upcoming due tickets (next N days)
      db.workOrder.findMany({
        where: {
          etaDlaDate: { gte: new Date(), lte: new Date(Date.now() + upcomingDays * 86400000) },
          status: { not: "ticket-completed" },
        },
        orderBy: { etaDlaDate: "asc" },
        take: 8,
        select: {
          id: true, ticketId: true, clientName: true, status: true,
          fieldEngineerName: true, etaDlaDate: true, siteLocation: true,
        },
      }),

      // 7. Financial totals
      db.workOrder.aggregate({
        _sum: { hours: true, expenses: true, incurredExpenses: true, hourlyRate: true, billRate: true },
        _count: { id: true },
      }),
    ]);

    // Compute KPIs
    const statusMap: Record<string, number> = {};
    for (const sc of statusCounts) {
      statusMap[sc.status] = sc._count.id;
    }

    const openPending = statusMap["open-pending"] || 0;
    const openNotPosted = statusMap["open-not-posted"] || 0;
    const actionRequired = statusMap["action-required"] || 0;
    const completed = statusMap["ticket-completed"] || 0;
    const inBilling = statusMap["in-process-billing"] || 0;
    const techCancelled = statusMap["tech-cancelled"] || 0;
    const cancelled = statusMap["cancelled"] || 0;

    const totalHours = Number(financials._sum.hours) || 0;
    const totalExpenses = Number(financials._sum.expenses) || 0;
    const totalIncurred = Number(financials._sum.incurredExpenses) || 0;
    const totalBillRate = Number(financials._sum.billRate) || 0;
    const totalHourlyRate = Number(financials._sum.hourlyRate) || 0;

    // Revenue estimate: sum of (hours * billRate) per ticket — approximate using avg bill rate
    const totalRevenue = totalHours * (financials._count.id > 0 ? totalBillRate / financials._count.id : 0);
    const totalPayroll = totalHours * (financials._count.id > 0 ? totalHourlyRate / financials._count.id : 0);

    return jsonOk({
      kpis: {
        totalTickets,
        openPending: openPending + openNotPosted,
        actionRequired,
        completed,
        inBilling,
        techCancelled,
        cancelled,
        totalHours: Math.round(totalHours * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalIncurred: Math.round(totalIncurred * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPayroll: Math.round(totalPayroll * 100) / 100,
      },
      statusDistribution: statusCounts.map(sc => ({
        status: sc.status,
        count: sc._count.id,
      })),
      recentTickets,
      topClients: topClients.map(tc => ({
        clientName: tc.clientName,
        count: tc._count.id,
        totalHours: Math.round((Number(tc._sum.hours) || 0) * 100) / 100,
        totalExpenses: Math.round((Number(tc._sum.expenses) || 0) * 100) / 100,
      })),
      topEngineers: topEngineers.map(te => ({
        engineerName: te.fieldEngineerName,
        count: te._count.id,
        totalHours: Math.round((Number(te._sum.hours) || 0) * 100) / 100,
      })),
      upcomingDue,
    });
  } catch (e: any) {
    return jsonError(e.message || "Failed to fetch dashboard data");
  }
}
