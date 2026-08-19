// Techadox Integrated Field Coordinator Portal
// Core constants: statuses, roles, themes, permissions, pay rate types, job platforms.
// Human-built system.

export type ColorThemeKey =
  | "teal"
  | "classicBlue"
  | "slate"
  | "emerald"
  | "crimson"
  | "midnight"
  | "sunset";

export const COLOR_THEMES: {
  key: ColorThemeKey;
  label: string;
  description: string;
  swatch: string[];
}[] = [
  { key: "teal", label: "Teal", description: "Professional teal / blue-green palette", swatch: ["#0d9488", "#14b8a6", "#f0fdfa"] },
  { key: "classicBlue", label: "Classic Blue", description: "Corporate navy palette", swatch: ["#1d4ed8", "#3b82f6", "#eff6ff"] },
  { key: "slate", label: "Slate", description: "Neutral gray palette", swatch: ["#475569", "#64748b", "#f1f5f9"] },
  { key: "emerald", label: "Emerald", description: "Rich green palette", swatch: ["#059669", "#10b981", "#ecfdf5"] },
  { key: "crimson", label: "Crimson", description: "Bold red palette", swatch: ["#e11d48", "#f43f5e", "#fff1f2"] },
  { key: "midnight", label: "Midnight", description: "Deep indigo / purple palette", swatch: ["#6d28d9", "#7c3aed", "#f5f3ff"] },
  { key: "sunset", label: "Sunset", description: "Warm orange palette", swatch: ["#ea580c", "#f97316", "#fff7ed"] },
];

// The seven color-coded work order statuses.
export interface StatusDef {
  key: string;
  label: string;
  bg: string; // row background
  text: string; // text color
}

export const STATUSES: StatusDef[] = [
  { key: "ticket-completed", label: "Ticket Completed", bg: "#FFFFFF", text: "#000000" },
  { key: "open-pending", label: "Open / Pending", bg: "#FFF97A", text: "#000000" },
  { key: "open-not-posted", label: "Open / Not Yet Posted", bg: "#FFF97A", text: "#F44336" },
  { key: "action-required", label: "Action Required", bg: "#FFCC99", text: "#000000" },
  { key: "tech-cancelled", label: "Tech Cancelled / Abandoned", bg: "#FF9999", text: "#FFFFFF" },
  { key: "cancelled", label: "Cancelled", bg: "#F5C2F5", text: "#000000" },
  { key: "in-process-billing", label: "In Process of Billing", bg: "#A5F2FC", text: "#000000" },
];

export const STATUS_MAP: Record<string, StatusDef> = STATUSES.reduce(
  (acc, s) => ({ ...acc, [s.key]: s }),
  {} as Record<string, StatusDef>
);

export const DEFAULT_STATUS = "open-pending";

// System roles
export const SYSTEM_ROLES = ["Super Admin", "Admin", "Manager", "Dispatcher"] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

// Permission keys for the role matrix
export const PERMISSIONS = [
  { key: "view_dispatch", label: "View Dispatch Board" },
  { key: "create_workorder", label: "Create Work Order" },
  { key: "edit_workorder", label: "Edit Work Order" },
  { key: "delete_workorder", label: "Delete Work Order" },
  { key: "change_status", label: "Change Work Order Status" },
  { key: "upload_attachments", label: "Upload Attachments" },
  { key: "view_reports", label: "View Reports" },
  { key: "export_reports", label: "Export Reports" },
  { key: "view_invoices", label: "View Invoices" },
  { key: "create_invoice", label: "Create / Edit Invoice" },
  { key: "delete_invoice", label: "Delete Invoice" },
  { key: "view_audit_board", label: "Access Edit Ticket" },
  { key: "manage_users", label: "Manage Users" },
  { key: "manage_roles", label: "Manage Roles" },
  { key: "manage_settings", label: "Manage Settings" },
  { key: "seed_data", label: "Seed / Clear Data" },
  { key: "view_accounts", label: "View Accounts (QuickBooks)" },
] as const;

// Default permission sets per system role
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  "Super Admin": PERMISSIONS.reduce((a, p) => ({ ...a, [p.key]: true }), {}),
  Admin: PERMISSIONS.reduce((a, p) => {
    const excluded = ["seed_data"];
    return { ...a, [p.key]: !excluded.includes(p.key) };
  }, {}),
  Manager: PERMISSIONS.reduce((a, p) => {
    const allowed = ["view_dispatch", "view_reports", "export_reports", "view_invoices", "view_audit_board", "change_status", "edit_workorder"];
    return { ...a, [p.key]: allowed.includes(p.key) };
  }, {}),
  Dispatcher: PERMISSIONS.reduce((a, p) => {
    const allowed = ["view_dispatch", "create_workorder", "edit_workorder", "change_status", "upload_attachments", "view_audit_board"];
    return { ...a, [p.key]: allowed.includes(p.key) };
  }, {}),
};

export const PAY_RATE_TYPES_PRIMARY = [
  "Hourly",
  "Flat Rate",
  "Per Device",
  "Per Mile",
  "Daily Rate",
  "Project Based",
];

export const PAY_RATE_TYPES_SECONDARY = [
  "Standard",
  "Overtime",
  "After Hours",
  "Weekend",
  "Holiday",
  "Emergency",
  "Travel",
];

export const JOB_PLATFORMS_SEED = [
  "FieldNation",
  "WorkMarket",
  "OnForce",
  "B2X",
  "Direct Client",
  "Internal",
];

// Allowed company email domains
export const ALLOWED_EMAIL_DOMAINS = ["techadox.com", "techadox.net"];

export function isAllowedCompanyEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return false;
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

// Company info
export const COMPANY = {
  name: "Techadox",
  tagline: "Field Technology. Connected.",
  address: "261 Chapman Road, Suite 104 A, Newark, DE 19702",
  phone: "+1 (302) 898-8245",
  website: "https://www.techadox.com/",
  email: "support@techadox.com",
  developer: "Built by Clintus Victoriya",
};

// Grid column definitions for the dispatch board
export interface GridColumn {
  key: string;
  label: string;
  sortable: boolean;
  filterable: boolean;
  defaultVisible: boolean;
  width?: number;
}

export const GRID_COLUMNS: GridColumn[] = [
  { key: "ticketId", label: "Ticket ID", sortable: true, filterable: true, defaultVisible: true, width: 130 },
  { key: "clientName", label: "Client", sortable: true, filterable: true, defaultVisible: true, width: 160 },
  { key: "jobPlatformName", label: "Job Platform", sortable: true, filterable: true, defaultVisible: true, width: 140 },
  { key: "status", label: "Status", sortable: true, filterable: true, defaultVisible: true, width: 190 },
  { key: "siteLocation", label: "Site / Location", sortable: true, filterable: true, defaultVisible: true, width: 180 },
  { key: "fieldEngineerName", label: "Field Engineer", sortable: true, filterable: true, defaultVisible: true, width: 160 },
  { key: "payRatePrimary", label: "Pay Rate (Primary)", sortable: true, filterable: true, defaultVisible: false, width: 150 },
  { key: "payRateSecondary", label: "Pay Rate (Secondary)", sortable: true, filterable: true, defaultVisible: false, width: 160 },
  { key: "hours", label: "Hours", sortable: true, filterable: true, defaultVisible: true, width: 90 },
  { key: "expenses", label: "Expenses", sortable: true, filterable: true, defaultVisible: true, width: 110 },
  { key: "hourlyRate", label: "Hourly Rate", sortable: true, filterable: true, defaultVisible: false, width: 110 },
  { key: "incurredExpenses", label: "Incurred Expenses", sortable: true, filterable: true, defaultVisible: false, width: 140 },
  { key: "dateCreated", label: "Date Created", sortable: true, filterable: true, defaultVisible: true, width: 140 },
  { key: "dateModified", label: "Date Modified", sortable: true, filterable: true, defaultVisible: false, width: 140 },
  { key: "customerReferences", label: "Customer Refs", sortable: false, filterable: true, defaultVisible: false, width: 180 },
  { key: "comments", label: "Comments", sortable: false, filterable: true, defaultVisible: false, width: 220 },
];

export const DEFAULT_COLUMN_ORDER = GRID_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key);

// Report column options (subset relevant to reporting)
export const REPORT_COLUMN_OPTIONS: { key: string; label: string }[] = [
  { key: "ticketId", label: "Ticket ID" },
  { key: "clientName", label: "Client" },
  { key: "status", label: "Status" },
  { key: "jobPlatformName", label: "Job Platform" },
  { key: "siteLocation", label: "Site / Location" },
  { key: "fieldEngineerName", label: "Field Engineer" },
  { key: "payRatePrimary", label: "Pay Rate (Primary)" },
  { key: "payRateSecondary", label: "Pay Rate (Secondary)" },
  { key: "hours", label: "Hours" },
  { key: "expenses", label: "Expenses" },
  { key: "incurredExpenses", label: "Incurred Expenses" },
  { key: "hourlyRate", label: "Hourly Rate" },
  { key: "dateCreated", label: "Date Created" },
  { key: "dateModified", label: "Date Modified" },
];

export const DEFAULT_REPORT_COLUMNS = [
  "ticketId",
  "clientName",
  "status",
  "fieldEngineerName",
  "hours",
  "expenses",
  "dateCreated",
];

// Dashboard format columns for XLSX export (matches Geodis Dashboard format.xlsx)
export interface DashboardColumn {
  key: string;
  label: string;
  group: string;
  source: string;
}

export const DASHBOARD_COLUMNS: DashboardColumn[] = [
  { key: "sso", label: "SSO", group: "Geodis Reference", source: "ticketId" },
  { key: "trackingNumber", label: "Tracking Number", group: "Shipment Information", source: "ticketId" },
  { key: "consignorCity", label: "Consignor City", group: "Shipment Information", source: "city" },
  { key: "consignorState", label: "Consignor State", group: "Shipment Information", source: "state" },
  { key: "consignorZipCode", label: "Consignor Zip Code", group: "Shipment Information", source: "zipCode" },
  { key: "consignorCountry", label: "Consignor Country", group: "Shipment Information", source: "country" },
  { key: "actualPickupDate", label: "Actual Pickup Date", group: "Shipment Information", source: "etaDlaDate" },
  { key: "actualDeliveryDate", label: "Actual Delivery Date", group: "Shipment Information", source: "workedEndTime" },
  { key: "invoiceDate", label: "Invoice Date", group: "Shipment Information", source: "dateCreated" },
  { key: "invoiceNumber", label: "Invoice Number", group: "Shipment Information", source: "ticketId" },
  { key: "qtyHours", label: "QTY (Hours)", group: "Shipment Charges", source: "hours" },
  { key: "price", label: "Price", group: "Shipment Charges", source: "hourlyRate" },
  { key: "totalAmount", label: "Total Amount", group: "Shipment Charges", source: "computed_hours_x_rate" },
  { key: "additionalCharges", label: "Additional Charges", group: "Shipment Charges", source: "expenses" },
  { key: "totalAmountFinal", label: "Total Amount", group: "Shipment Charges", source: "computed_total_with_expenses" },
  { key: "totalInvoice", label: "Total Invoice", group: "Shipment Charges", source: "computed_total_with_expenses" },
  { key: "reference", label: "Reference", group: "Ad Hoc Reference", source: "salesOrder" },
];

// Notification alert types
export const NOTIFICATION_TYPES = [
  { key: "newTicket", label: "New Ticket Assigned" },
  { key: "statusChanged", label: "Status Changed" },
  { key: "fileUploaded", label: "File Uploaded" },
  { key: "invoiceGenerated", label: "Invoice Generated" },
  { key: "paymentReceived", label: "Payment Received" },
];

export const DEFAULT_NOTIFY_PREFS = {
  newTicket: { email: true, inApp: true },
  statusChanged: { email: false, inApp: true },
  fileUploaded: { email: false, inApp: true },
  invoiceGenerated: { email: true, inApp: true },
  paymentReceived: { email: true, inApp: true },
  quietHours: { enabled: false, start: "18:00", end: "08:00" },
};

export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];

// Attachment limits
export const ATTACHMENT_LIMITS = {
  maxFiles: 10,
  maxFileSizeMB: 10,
  allowedImage: [".jpg", ".jpeg", ".png", ".gif"],
  allowedDoc: [".pdf", ".docx", ".xlsx"],
};

export function getAllowedExtensions(): string[] {
  return [...ATTACHMENT_LIMITS.allowedImage, ...ATTACHMENT_LIMITS.allowedDoc];
}
