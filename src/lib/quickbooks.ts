// QuickBooks Online API Client — OAuth 2.0 integration
// Handles token management, API calls, and data sync operations.

const QB_BASE_URL =
  process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";

const QB_AUTH_URL =
  process.env.QB_ENVIRONMENT === "production"
    ? "https://app.intuit.com/connect/authorize"
    : "https://app.sandbox.qbo.intuit.com/app/connect/authorize";

const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

function getClientId() {
  return process.env.QB_CLIENT_ID || "";
}
function getClientSecret() {
  return process.env.QB_CLIENT_SECRET || "";
}
function getRedirectUri() {
  return process.env.QB_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/accounts/quickbooks/callback`;
}

// ---- OAuth helpers ----

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting com.intuit.quickbooks.payment",
    state,
  });
  return `${QB_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_realm_id: string;
}> {
  const res = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    x_realm_id: data.realmId || "",
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
}

// ---- Generic QB API caller ----

async function qbApiCall<T>(endpoint: string, accessToken: string, realmId: string, options?: RequestInit): Promise<T> {
  const url = `${QB_BASE_URL}/v3/company/${realmId}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`QuickBooks API error (${res.status}): ${err}`);
  }

  return res.json() as Promise<T>;
}

// ---- Company Info ----

export async function getCompanyInfo(accessToken: string, realmId: string) {
  const data = await qbApiCall<{ CompanyInfo: Record<string, unknown> }>("/companyinfo/${realmId}?minorversion=75", accessToken, realmId);
  return data.CompanyInfo;
}

// ---- Customers (sync from TDX clients to QB) ----

export async function createQBCustomer(accessToken: string, realmId: string, client: { name: string; email?: string; phone?: string }) {
  return qbApiCall<{ Customer: Record<string, unknown> }>("/customer?minorversion=75", accessToken, realmId, {
    method: "POST",
    body: JSON.stringify({
      DisplayName: client.name,
      PrimaryEmailAddr: client.email ? { Address: client.email } : undefined,
      PrimaryPhone: client.phone ? { FreeFormNumber: client.phone } : undefined,
    }),
  });
}

export async function findQBCustomerByEmail(accessToken: string, realmId: string, email: string) {
  const query = encodeURIComponent(`SELECT * FROM Customer WHERE PrimaryEmailAddr = '${email}'`);
  const data = await qbApiCall<{ QueryResponse: { Customer: Record<string, unknown>[] } }>(`/query?query=${query}&minorversion=75`, accessToken, realmId);
  return data.QueryResponse.Customer?.[0] || null;
}

export async function listQBCustomers(accessToken: string, realmId: string) {
  const query = encodeURIComponent("SELECT * FROM Customer MAXRESULTS 100");
  const data = await qbApiCall<{ QueryResponse: { Customer: Record<string, unknown>[] } }>(`/query?query=${query}&minorversion=75`, accessToken, realmId);
  return data.QueryResponse.Customer || [];
}

// ---- Invoices (push TDX invoices to QB) ----

export async function createQBInvoice(accessToken: string, realmId: string, invoice: {
  customerRef: string;
  lineItems: { description: string; amount: number; qty?: number }[];
  dueDate?: string;
  txnDate?: string;
}) {
  const lines = invoice.lineItems.map((li, i) => ({
    Id: i + 1,
    Description: li.description,
    Amount: li.amount,
    DetailType: "SalesItemLineDetail",
    SalesItemLineDetail: {
      Qty: li.qty || 1,
      UnitPrice: li.qty ? li.amount / li.qty : li.amount,
      TaxCodeRef: { value: "NON" },
    },
  }));

  return qbApiCall<{ Invoice: Record<string, unknown> }>("/invoice?minorversion=75", accessToken, realmId, {
    method: "POST",
    body: JSON.stringify({
      CustomerRef: { value: invoice.customerRef },
      Line: lines,
      DueDate: invoice.dueDate,
      TxnDate: invoice.txnDate,
      SalesTermRef: { value: "3" }, // Net 30
    }),
  });
}

export async function listQBInvoices(accessToken: string, realmId: string) {
  const query = encodeURIComponent("SELECT * FROM Invoice MAXRESULTS 100 ORDERBY TxnDate DESC");
  const data = await qbApiCall<{ QueryResponse: { Invoice: Record<string, unknown>[] } }>(`/query?query=${query}&minorversion=75`, accessToken, realmId);
  return data.QueryResponse.Invoice || [];
}

// ---- Payments ----

export async function createQBPayment(accessToken: string, realmId: string, payment: {
  customerRef: string;
  totalAmount: number;
  invoiceRef?: string;
  paymentMethod?: string;
  txnDate?: string;
}) {
  return qbApiCall<{ Payment: Record<string, unknown> }>("/payment?minorversion=75", accessToken, realmId, {
    method: "POST",
    body: JSON.stringify({
      CustomerRef: { value: payment.customerRef },
      TotalAmt: payment.totalAmount,
      Line: payment.invoiceRef
        ? [{ Amount: payment.totalAmount, LinkedTxn: [{ TxnId: payment.invoiceRef, TxnType: "Invoice" }] }]
        : undefined,
      PaymentMethodRef: payment.paymentMethod ? { value: payment.paymentMethod } : undefined,
      TxnDate: payment.txnDate,
    }),
  });
}

export async function listQBPayments(accessToken: string, realmId: string) {
  const query = encodeURIComponent("SELECT * FROM Payment MAXRESULTS 100 ORDERBY TxnDate DESC");
  const data = await qbApiCall<{ QueryResponse: { Payment: Record<string, unknown>[] } }>(`/query?query=${query}&minorversion=75`, accessToken, realmId);
  return data.QueryResponse.Payment || [];
}

// ---- Accounts (Chart of Accounts) ----

export async function listQBAccounts(accessToken: string, realmId: string) {
  const query = encodeURIComponent("SELECT * FROM Account MAXRESULTS 100 WHERE Active = true");
  const data = await qbApiCall<{ QueryResponse: { Account: Record<string, unknown>[] } }>(`/query?query=${query}&minorversion=75`, accessToken, realmId);
  return data.QueryResponse.Account || [];
}

// ---- Reports ----

export async function getProfitAndLoss(accessToken: string, realmId: string, params?: { startDate?: string; endDate?: string }) {
  const sp = new URLSearchParams({ minorversion: "75" });
  if (params?.startDate) sp.set("start_date", params.startDate);
  if (params?.endDate) sp.set("end_date", params.endDate);
  return qbApiCall<{ ProfitAndLoss: Record<string, unknown> }>(`/reports/ProfitAndLoss?${sp}`, accessToken, realmId);
}

export async function getBalanceSheet(accessToken: string, realmId: string, params?: { startDate?: string; endDate?: string }) {
  const sp = new URLSearchParams({ minorversion: "75" });
  if (params?.startDate) sp.set("start_date", params.startDate);
  if (params?.endDate) sp.set("end_date", params.endDate);
  return qbApiCall<{ BalanceSheet: Record<string, unknown> }>(`/reports/BalanceSheet?${sp}`, accessToken, realmId);
}

export async function getAgingReport(accessToken: string, realmId: string) {
  const sp = new URLSearchParams({ minorversion: "75", report_date: new Date().toISOString().split("T")[0] });
  return qbApiCall<Record<string, Record<string, unknown>>>(`/reports/ARAging?${sp}`, accessToken, realmId);
}

// ---- Reconnect / Validate token ----

export async function validateConnection(accessToken: string, realmId: string) {
  try {
    await getCompanyInfo(accessToken, realmId);
    return true;
  } catch {
    return false;
  }
}
