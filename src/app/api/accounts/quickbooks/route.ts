import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission, logAudit, jsonError, jsonOk } from "@/lib/server";
import { getAuthUrl, refreshAccessToken, validateConnection } from "@/lib/quickbooks";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Helper: Check if QB credentials are configured
function qbConfigured(): boolean {
  return !!(process.env.QB_CLIENT_ID && process.env.QB_CLIENT_SECRET && process.env.QB_CLIENT_ID !== "your_quickbooks_client_id");
}

// Helper: Get active connection and refresh token if needed
async function getActiveConnection() {
  const conn = await db.quickBooksConnection.findFirst({ where: { connected: true }, orderBy: { connectedAt: "desc" } });
  if (!conn) return null;
  return conn;
}

// GET — check QuickBooks connection status + configuration
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!hasPermission(user, "view_accounts")) return jsonError("Forbidden", 403);

  const configured = qbConfigured();
  const conn = await getActiveConnection();

  if (!configured) {
    return jsonOk({
      connected: false,
      configured: false,
      accountName: null,
      connectedAt: null,
      realmId: null,
      syncStatus: null,
      lastSyncAt: null,
    });
  }

  if (!conn) {
    return jsonOk({
      connected: false,
      configured: true,
      accountName: null,
      connectedAt: null,
      realmId: null,
      syncStatus: null,
      lastSyncAt: null,
    });
  }

  // Check if token needs refresh
  let tokenValid = false;
  if (conn.expiresAt && conn.refreshToken) {
    const needsRefresh = new Date(conn.expiresAt) < new Date(Date.now() + 5 * 60 * 1000); // Refresh 5 min before expiry
    if (needsRefresh) {
      try {
        const newTokens = await refreshAccessToken(conn.refreshToken);
        await db.quickBooksConnection.update({
          where: { id: conn.id },
          data: {
            accessToken: newTokens.access_token,
            refreshToken: newTokens.refresh_token,
            expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
          },
        });
        tokenValid = true;
      } catch {
        tokenValid = false;
      }
    } else {
      tokenValid = true;
    }
  }

  return jsonOk({
    connected: conn.connected && tokenValid,
    configured: true,
    accountName: conn.accountName,
    connectedAt: conn.connectedAt,
    realmId: conn.realmId,
    syncStatus: conn.syncStatus,
    lastSyncAt: conn.lastSyncAt,
    lastSyncError: conn.lastSyncError,
    tokenExpired: !tokenValid,
  });
}

// POST — connect / disconnect / sync actions
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!hasPermission(user, "view_accounts")) return jsonError("Forbidden", 403);

  let body: { action?: string; accountName?: string; syncType?: string; invoiceIds?: string[] };
  try { body = await req.json(); } catch { return jsonError("Invalid body"); }

  const action = body.action;

  // --- INITIATE OAUTH CONNECTION ---
  if (action === "connect") {
    if (!qbConfigured()) {
      return jsonError("QuickBooks OAuth is not configured. Please set QB_CLIENT_ID and QB_CLIENT_SECRET in .env", 400);
    }

    // Generate CSRF state
    const state = crypto.randomBytes(32).toString("hex");
    const authUrl = getAuthUrl(state);

    // Save state in a temporary Setting for verification
    await db.setting.upsert({
      where: { key: "qb_oauth_state" },
      update: { value: state },
      create: { key: "qb_oauth_state", value: state },
    });

    await logAudit({ user, action: "QB_CONNECT_INIT", entity: "QuickBooks", details: "Initiated OAuth connection" });
    return jsonOk({ authUrl, state });
  }

  // --- DISCONNECT ---
  if (action === "disconnect") {
    await db.quickBooksConnection.deleteMany();
    await logAudit({ user, action: "QB_DISCONNECT", entity: "QuickBooks", details: "Disconnected QuickBooks" });
    return jsonOk({ connected: false });
  }

  // --- SYNC: Push invoices to QuickBooks ---
  if (action === "sync" && body.syncType === "invoices") {
    const conn = await getActiveConnection();
    if (!conn) return jsonError("Not connected to QuickBooks", 400);

    // Mark as syncing
    await db.quickBooksConnection.update({ where: { id: conn.id }, data: { syncStatus: "syncing" } });

    const invoiceIds = body.invoiceIds;
    const where = invoiceIds?.length ? { id: { in: invoiceIds } } : {};
    const invoices = await db.invoice.findMany({ where });

    const synced: string[] = [];
    const errors: string[] = [];

    for (const inv of invoices) {
      try {
        const { createQBInvoice } = await import("@/lib/quickbooks");
        // Use client name to find/create QB customer (in real flow, we'd have QB customer refs)
        await createQBInvoice(conn.accessToken, conn.realmId, {
          customerRef: inv.clientName || "Unknown Client",
          lineItems: JSON.parse(inv.lineItems || "[]").map((li: { description?: string; amount: number; quantity: number }) => ({
            description: li.description || `Service ${inv.invoiceNumber}`,
            amount: li.amount || inv.subtotal,
            qty: li.quantity || 1,
          })),
          dueDate: inv.dueDate ? inv.dueDate.toISOString().split("T")[0] : undefined,
          txnDate: inv.issueDate ? inv.issueDate.toISOString().split("T")[0] : undefined,
        });

        await db.quickBooksSyncLog.create({
          data: { syncType: "invoice", direction: "push", entityType: "Invoice", entityId: inv.id, status: "success", summary: `Pushed ${inv.invoiceNumber}` },
        });
        synced.push(inv.invoiceNumber);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        await db.quickBooksSyncLog.create({
          data: { syncType: "invoice", direction: "push", entityType: "Invoice", entityId: inv.id, status: "error", summary: msg },
        });
        errors.push(`${inv.invoiceNumber}: ${msg}`);
      }
    }

    await db.quickBooksConnection.update({
      where: { id: conn.id },
      data: { syncStatus: "synced", lastSyncAt: new Date(), lastSyncError: errors.join("; ") || "" },
    });

    await logAudit({ user, action: "QB_SYNC_INVOICES", entity: "QuickBooks", details: `Synced ${synced.length} invoices, ${errors.length} errors` });
    return jsonOk({ synced, errors, total: invoices.length });
  }

  // --- SYNC: Pull QuickBooks data ---
  if (action === "sync" && body.syncType === "pull") {
    const conn = await getActiveConnection();
    if (!conn) return jsonError("Not connected to QuickBooks", 400);

    await db.quickBooksConnection.update({ where: { id: conn.id }, data: { syncStatus: "syncing" } });

    const results: Record<string, unknown[]> = {};

    try {
      const { listQBCustomers, listQBInvoices, listQBPayments, listQBAccounts } = await import("@/lib/quickbooks");

      results.customers = await listQBCustomers(conn.accessToken, conn.realmId);
      results.invoices = await listQBInvoices(conn.accessToken, conn.realmId);
      results.payments = await listQBPayments(conn.accessToken, conn.realmId);
      results.accounts = await listQBAccounts(conn.accessToken, conn.realmId);

      await db.quickBooksSyncLog.create({
        data: {
          syncType: "pull",
          direction: "pull",
          entityType: "FullSync",
          status: "success",
          summary: `Pulled ${results.customers.length} customers, ${results.invoices.length} invoices, ${results.payments.length} payments, ${results.accounts.length} accounts`,
        },
      });

      await db.quickBooksConnection.update({
        where: { id: conn.id },
        data: { syncStatus: "synced", lastSyncAt: new Date(), lastSyncError: "" },
      });

      await logAudit({ user, action: "QB_PULL_DATA", entity: "QuickBooks", details: "Pulled all data from QuickBooks" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await db.quickBooksConnection.update({
        where: { id: conn.id },
        data: { syncStatus: "error", lastSyncError: msg },
      });
      await logAudit({ user, action: "QB_PULL_ERROR", entity: "QuickBooks", details: msg });
      return jsonError(`Pull failed: ${msg}`, 500);
    }

    return jsonOk(results);
  }

  // --- SYNC: Push payments ---
  if (action === "sync" && body.syncType === "payments") {
    const conn = await getActiveConnection();
    if (!conn) return jsonError("Not connected to QuickBooks", 400);

    await db.quickBooksConnection.update({ where: { id: conn.id }, data: { syncStatus: "syncing" } });

    const payments = await db.payment.findMany({
      where: { status: "Completed" },
      orderBy: { createdAt: "desc" },
    });

    const synced: string[] = [];
    const errors: string[] = [];

    for (const pay of payments) {
      try {
        const { createQBPayment } = await import("@/lib/quickbooks");
        const inv = await db.invoice.findUnique({ where: { id: pay.invoiceId } });
        await createQBPayment(conn.accessToken, conn.realmId, {
          customerRef: inv?.clientName || "Unknown Client",
          totalAmount: pay.amount,
          txnDate: pay.createdAt.toISOString().split("T")[0],
        });
        synced.push(pay.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${pay.id}: ${msg}`);
      }
    }

    await db.quickBooksConnection.update({
      where: { id: conn.id },
      data: { syncStatus: "synced", lastSyncAt: new Date(), lastSyncError: errors.join("; ") || "" },
    });

    return jsonOk({ synced, errors, total: payments.length });
  }

  // --- GET REPORTS ---
  if (action === "report") {
    const conn = await getActiveConnection();
    if (!conn) return jsonError("Not connected to QuickBooks", 400);

    const reportType = body.syncType; // "profit_loss" | "balance_sheet" | "aging"
    try {
      const { getProfitAndLoss, getBalanceSheet, getAgingReport } = await import("@/lib/quickbooks");
      if (reportType === "profit_loss") {
        const data = await getProfitAndLoss(conn.accessToken, conn.realmId);
        return jsonOk(data);
      }
      if (reportType === "balance_sheet") {
        const data = await getBalanceSheet(conn.accessToken, conn.realmId);
        return jsonOk(data);
      }
      if (reportType === "aging") {
        const data = await getAgingReport(conn.accessToken, conn.realmId);
        return jsonOk(data);
      }
      return jsonError("Unknown report type", 400);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return jsonError(`Report failed: ${msg}`, 500);
    }
  }

  // --- VALIDATE TOKEN ---
  if (action === "validate") {
    const conn = await getActiveConnection();
    if (!conn) return jsonError("Not connected", 400);
    try {
      const valid = await validateConnection(conn.accessToken, conn.realmId);
      return jsonOk({ valid });
    } catch {
      return jsonOk({ valid: false });
    }
  }

  return jsonError("Unknown action", 400);
}
