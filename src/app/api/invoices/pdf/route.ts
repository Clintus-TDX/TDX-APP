import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission, jsonError } from "@/lib/server";
import { COMPANY } from "@/lib/constants";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

// Load logo as base64 once for PDF embedding
let LOGO_BASE64 = "";
try {
  const logoBuf = readFileSync(join(process.cwd(), "public/Techadox_Logo.png"));
  LOGO_BASE64 = `data:image/png;base64,${logoBuf.toString("base64")}`;
} catch { /* logo not found */ }

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "view_invoices")) return jsonError("Unauthorized", 401);

  const sp = req.nextUrl.searchParams;
  const invoiceId = sp.get("invoiceId");
  if (!invoiceId) return jsonError("invoiceId is required", 400);

  const inv = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) return jsonError("Invoice not found", 404);

  let lineItems: { description: string; quantity: number; rate: number; amount: number }[] = [];
  try { lineItems = inv.lineItems ? JSON.parse(inv.lineItems) : []; } catch { lineItems = []; }

  // Fetch client email if available
  let clientEmail = "";
  if (inv.clientId) {
    try {
      const client = await db.client.findUnique({ where: { id: inv.clientId }, select: { contactEmail: true } });
      if (client?.contactEmail) clientEmail = client.contactEmail;
    } catch { /* ignore */ }
  }

  const fmtDate = (d: Date | string | null) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }); } catch { return "—"; }
  };
  const fmtMoney = (v: number) => `$${Number(v).toFixed(2)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice ${inv.invoiceNumber}</title>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; background: #fff; padding: 48px; }
  .header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
  .header .logo { width: 56px; height: 56px; object-fit: contain; border-radius: 6px; }
  .header .info h1 { font-size: 28px; font-weight: 700; color: #0d9488; margin-bottom: 2px; }
  .header .info p { font-size: 13px; color: #555; line-height: 1.6; }
  .header .contact { font-size: 12px; color: #666; margin-top: 2px; }
  .invoice-title { text-align: right; font-size: 32px; font-weight: 700; color: #1a1a1a; letter-spacing: 2px; margin-bottom: 24px; }
  .meta-row { display: flex; gap: 32px; margin-bottom: 28px; }
  .meta-block { flex: 1; }
  .meta-block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 8px; font-weight: 600; }
  .meta-block .value { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
  .meta-block .sub { font-size: 12px; color: #555; line-height: 1.5; }
  .divider { border: none; border-top: 2px solid #e5e7eb; margin: 20px 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #f8fafc; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; }
  thead th:nth-child(2), thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
  tbody td { font-size: 13px; padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
  tbody td:nth-child(2), tbody td:nth-child(3), tbody td:nth-child(4) { text-align: right; }
  .totals { display: flex; justify-content: flex-end; }
  .totals-table { width: 300px; }
  .totals-table .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .totals-table .row.total { border-top: 2px solid #1a1a1a; padding-top: 10px; margin-top: 4px; font-size: 18px; font-weight: 700; }
  .notes { background: #f8fafc; padding: 16px; border-radius: 6px; margin-top: 24px; }
  .notes h4 { font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  .notes p { font-size: 12px; color: #555; line-height: 1.6; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #888; text-align: center; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <img class="logo" src="${LOGO_BASE64}" alt="Techadox Logo" onerror="this.style.display='none'" />
    <div class="info">
      <h1>${COMPANY.name}</h1>
      <p>${COMPANY.address}</p>
      <p class="contact">Phone: ${COMPANY.phone}  |  Email: ${COMPANY.email}</p>
    </div>
  </div>

  <div class="invoice-title">INVOICE</div>

  <div class="meta-row">
    <div class="meta-block">
      <h3>Invoice No.</h3>
      <div class="value">${inv.invoiceNumber}</div>
      <h3 style="margin-top:12px">Submitted On</h3>
      <div class="value">${fmtDate(inv.issueDate)}</div>
    </div>
    <div class="meta-block">
      <h3>Purchase Order</h3>
      <div class="value">PO-${inv.invoiceNumber.replace("INV-", "")}</div>
      <h3 style="margin-top:12px">Payment Rule</h3>
      <div class="value">Net 30 Days</div>
      <h3 style="margin-top:12px">Due Date</h3>
      <div class="value">${fmtDate(inv.dueDate)}</div>
    </div>
  </div>

  <hr class="divider" />

  <div class="meta-block" style="margin-bottom:24px">
    <h3>Prepared For (Bill To)</h3>
    <div class="value" style="font-size:16px">${inv.billToName || inv.clientName}</div>
    ${inv.billToAddress ? `<div class="sub">${inv.billToAddress}</div>` : ""}
    ${clientEmail ? `<div class="sub">Email: ${clientEmail}</div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th>Line Description of Services Rendered</th>
        <th>Hours / Qty</th>
        <th>Bill Rate ($)</th>
        <th>Total Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItems.length > 0 ? lineItems.map(li => `
      <tr>
        <td>${li.description}</td>
        <td>${li.quantity}</td>
        <td>${fmtMoney(li.rate)}</td>
        <td>${fmtMoney(li.amount)}</td>
      </tr>`).join("") : `
      <tr>
        <td>Professional Technical Dispatch Services [ID: ${inv.workOrderIds.replace(/[\[\]"]/g, "").slice(0, 20)}]</td>
        <td>${lineItems.length === 0 && inv.subtotal > 0 ? "1.0" : "—"}</td>
        <td>${fmtMoney(lineItems.length === 0 && inv.subtotal > 0 ? inv.subtotal : 0)}</td>
        <td>${fmtMoney(inv.subtotal)}</td>
      </tr>`}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-table">
      <div class="row"><span>Subtotal</span><span>${fmtMoney(inv.subtotal)}</span></div>
      <div class="row"><span>Tax (${(inv.taxRate * 100).toFixed(1)}%)</span><span>${fmtMoney(inv.tax)}</span></div>
      <div class="row total"><span>Total Due</span><span>${fmtMoney(inv.total)}</span></div>
    </div>
  </div>

  ${inv.notes ? `
  <div class="notes">
    <h4>Notes & Special Billing Instructions</h4>
    <p>${inv.notes.replace(/\\n/g, "<br>")}</p>
  </div>` : `
  <div class="notes">
    <h4>Notes & Special Billing Instructions</h4>
    <p>Payment Terms: Net 30 days. Please remit payment via ACH or wire directly to Techadox. Thank you!</p>
    <p>Thank you in advance for your valued business partnership with Techadox!</p>
  </div>`}

  <div class="footer">
    ${COMPANY.name} | ${COMPANY.address} | ${COMPANY.phone} | ${COMPANY.website}
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `attachment; filename="invoice-${inv.invoiceNumber}.html"`,
    },
  });
}
