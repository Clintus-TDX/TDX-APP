// Seed data utility for the Techadox portal (human-built demo data).
import { db } from "./db";
import { hashPassword } from "./auth";
import {
  JOB_PLATFORMS_SEED,
  DEFAULT_ROLE_PERMISSIONS,
  STATUSES,
  DEFAULT_STATUS,
  PERMISSIONS,
} from "./constants";

export async function ensureSystemRoles() {
  for (const name of Object.keys(DEFAULT_ROLE_PERMISSIONS)) {
    const existing = await db.role.findUnique({ where: { name } });
    if (!existing) {
      await db.role.create({
        data: {
          name,
          description: `System role: ${name}`,
          permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS[name]),
          isSystem: true,
        },
      });
    } else if (name !== "Super Admin") {
      // keep permissions in sync for system roles
      await db.role.update({
        where: { id: existing.id },
        data: { permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS[name]), isSystem: true },
      });
    } else {
      await db.role.update({
        where: { id: existing.id },
        data: {
          permissions: JSON.stringify(PERMISSIONS.reduce((a, p) => ({ ...a, [p.key]: true }), {})),
          isSystem: true,
        },
      });
    }
  }
}

export async function seedDatabase() {
  // 1. Roles
  await ensureSystemRoles();

  // 2. Job platforms
  for (const name of JOB_PLATFORMS_SEED) {
    const exists = await db.jobPlatform.findFirst({ where: { name } });
    if (!exists) await db.jobPlatform.create({ data: { name } });
  }
  const platforms = await db.jobPlatform.findMany();

  // 3. Clients
  const clientDefs = [
    { name: "Geodis Logistics", address: "120 Logistics Way, Memphis, TN 38116", contactName: "Marcus Reed", contactEmail: "mreed@geodis.com", contactPhone: "+1 (901) 555-0142" },
    { name: "Apex Retail Group", address: "880 Commerce Blvd, Dallas, TX 75201", contactName: "Lena Park", contactEmail: "lena.park@apexretail.com", contactPhone: "+1 (214) 555-0188" },
    { name: "Northwind Healthcare", address: "45 Medical Center Dr, Phoenix, AZ 85012", contactName: "Dr. Sam Whitfield", contactEmail: "swhitfield@northwindhc.com", contactPhone: "+1 (602) 555-0123" },
    { name: "Crestline Banking Corp", address: "200 Financial Plaza, Charlotte, NC 28202", contactName: "Priya Nair", contactEmail: "pnair@crestlinebank.com", contactPhone: "+1 (704) 555-0177" },
    { name: "Summit Manufacturing", address: "15 Industrial Pkwy, Columbus, OH 43215", contactName: "Hugo Castillo", contactEmail: "hcastillo@summitmfg.com", contactPhone: "+1 (614) 555-0199" },
  ];
  for (const c of clientDefs) {
    const exists = await db.client.findFirst({ where: { name: c.name } });
    if (!exists) await db.client.create({ data: c });
  }
  const clients = await db.client.findMany();

  // 4. Field engineers
  const engineerDefs = [
    { name: "James Carter", email: "jcarter@techadox.com", phone: "+1 (302) 555-0101", specialization: "Networking" },
    { name: "Sofia Ramirez", email: "sramirez@techadox.net", phone: "+1 (302) 555-0102", specialization: "POS Systems" },
    { name: "David Kim", email: "dkim@techadox.com", phone: "+1 (302) 555-0103", specialization: "CCTV / Security" },
    { name: "Aisha Mohammed", email: "amohammed@techadox.net", phone: "+1 (302) 555-0104", specialization: "Server Hardware" },
    { name: "Tom Brennan", email: "tbrennan@techadox.com", phone: "+1 (302) 555-0105", specialization: "Printers & Peripherals" },
    { name: "Nina Petrova", email: "npetrova@techadox.net", phone: "+1 (302) 555-0106", specialization: "RFID / Wireless" },
  ];
  for (const e of engineerDefs) {
    const exists = await db.fieldEngineer.findFirst({ where: { name: e.name } });
    if (!exists) await db.fieldEngineer.create({ data: e });
  }
  const engineers = await db.fieldEngineer.findMany();

  // 5. Super Admin user (default) if none exists
  const adminEmail = "admin@techadox.com";
  let admin = await db.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await db.user.create({
      data: {
        email: adminEmail,
        name: "Clintus Victoriya",
        passwordHash: await hashPassword("Techadox2024!"),
        role: "Super Admin",
        status: "Active",
        colorTheme: "teal",
        darkMode: false,
        columnOrder: JSON.stringify(["ticketId", "clientName", "jobPlatformName", "status", "siteLocation", "fieldEngineerName", "hours", "expenses", "dateCreated"]),
        pageSize: 10,
        reportColumns: JSON.stringify(["ticketId", "clientName", "status", "fieldEngineerName", "hours", "expenses", "dateCreated"]),
        reportColumnOrder: JSON.stringify(["ticketId", "clientName", "status", "fieldEngineerName", "hours", "expenses", "dateCreated"]),
        notifyPrefs: JSON.stringify({ newTicket: { email: true, inApp: true }, statusChanged: { email: false, inApp: true }, fileUploaded: { email: false, inApp: true }, invoiceGenerated: { email: true, inApp: true }, paymentReceived: { email: true, inApp: true }, quietHours: { enabled: false, start: "18:00", end: "08:00" } }),
      },
    });
  }

  // 6. Sample work orders
  const woCount = await db.workOrder.count();
  if (woCount === 0) {
    const samples = [
      { ticket: "TA-1001", clientIdx: 0, platform: "FieldNation", engIdx: 0, status: "open-pending", site: "Memphis Hub A, TN", street: "120 Logistics Way", city: "Memphis", state: "TN", zip: "38116", country: "USA", salesOrder: "RMA-44821", hours: 4, expenses: 25, hr: 85, prim: "Hourly", sec: "Standard", refs: "RMA-44821", comments: "Install replacement router at dock 7.", pickupDate: -2, startT: -1, endT: -1 },
      { ticket: "TA-1002", clientIdx: 1, platform: "WorkMarket", engIdx: 1, status: "in-process-billing", site: "Apex Store #214, Dallas, TX", street: "880 Commerce Blvd", city: "Dallas", state: "TX", zip: "75201", country: "USA", salesOrder: "PO-9921", hours: 2.5, expenses: 12, hr: 75, prim: "Hourly", sec: "After Hours", refs: "PO-9921", comments: "POS terminal swap, after hours.", pickupDate: -3, startT: -2, endT: -2 },
      { ticket: "TA-1003", clientIdx: 2, platform: "Direct Client", engIdx: 2, status: "action-required", site: "Northwind Clinic, Phoenix, AZ", street: "45 Medical Center Dr", city: "Phoenix", state: "AZ", zip: "85012", country: "USA", salesOrder: "TICKET-771", hours: 6, expenses: 40, hr: 90, prim: "Hourly", sec: "Emergency", refs: "TICKET-771", comments: "CCTV DVR failure, awaiting parts.", pickupDate: -5, startT: -4, endT: -4 },
      { ticket: "TA-1004", clientIdx: 3, platform: "OnForce", engIdx: 3, status: "ticket-completed", site: "Crestline HQ, Charlotte, NC", street: "200 Financial Plaza", city: "Charlotte", state: "NC", zip: "28202", country: "USA", salesOrder: "WO-5532", hours: 3, expenses: 0, hr: 95, prim: "Flat Rate", sec: "Standard", refs: "WO-5532", comments: "Server RAM upgrade completed.", pickupDate: -7, startT: -6, endT: -6 },
      { ticket: "TA-1005", clientIdx: 4, platform: "FieldNation", engIdx: 4, status: "open-not-posted", site: "Summit Plant 2, Columbus, OH", street: "15 Industrial Pkwy", city: "Columbus", state: "OH", zip: "43215", country: "USA", salesOrder: "REQ-118", hours: 0, expenses: 0, hr: 70, prim: "Hourly", sec: "Weekend", refs: "REQ-118", comments: "Printer queue issue, scheduled weekend.", pickupDate: 1, startT: null, endT: null },
      { ticket: "TA-1006", clientIdx: 0, platform: "B2X", engIdx: 5, status: "tech-cancelled", site: "Geodis Cross-Dock, TN", street: "3400 Distribution Ave", city: "Memphis", state: "TN", zip: "38118", country: "USA", salesOrder: "CX-301", hours: 1, expenses: 15, hr: 80, prim: "Hourly", sec: "Travel", refs: "CX-301", comments: "Engineer cancelled - site access denied.", pickupDate: -4, startT: -3, endT: -3 },
      { ticket: "TA-1007", clientIdx: 1, platform: "WorkMarket", engIdx: 0, status: "cancelled", site: "Apex Store #88, Plano, TX", street: "2200 Preston Rd", city: "Plano", state: "TX", zip: "75024", country: "USA", salesOrder: "CNL-44", hours: 0, expenses: 0, hr: 75, prim: "Hourly", sec: "Standard", refs: "CNL-44", comments: "Cancelled by client, reschedule TBD.", pickupDate: null, startT: null, endT: null },
      { ticket: "TA-1008", clientIdx: 2, platform: "Internal", engIdx: 1, status: "open-pending", site: "Northwind Annex, Phoenix, AZ", street: "510 Wellness Way", city: "Phoenix", state: "AZ", zip: "85004", country: "USA", salesOrder: "INT-09", hours: 2, expenses: 8, hr: 85, prim: "Hourly", sec: "Standard", refs: "INT-09", comments: "Wireless AP deployment.", pickupDate: -1, startT: 0, endT: 0 },
      { ticket: "TA-1009", clientIdx: 3, platform: "FieldNation", engIdx: 2, status: "in-process-billing", site: "Crestline Branch 4, NC", street: "1050 Park Rd", city: "Charlotte", state: "NC", zip: "28210", country: "USA", salesOrder: "BL-227", hours: 5, expenses: 30, hr: 90, prim: "Hourly", sec: "After Hours", refs: "BL-227", comments: "Security cam repositioning.", pickupDate: -6, startT: -5, endT: -5 },
      { ticket: "TA-1010", clientIdx: 4, platform: "Direct Client", engIdx: 3, status: "action-required", site: "Summit Plant 1, Columbus, OH", street: "500 Manufacturing Dr", city: "Columbus", state: "OH", zip: "43228", country: "USA", salesOrder: "DC-77", hours: 4, expenses: 22, hr: 95, prim: "Project Based", sec: "Standard", refs: "DC-77", comments: "Server rack rewire, awaiting approval.", pickupDate: -8, startT: -7, endT: -7 },
      { ticket: "TA-1011", clientIdx: 0, platform: "WorkMarket", engIdx: 4, status: "ticket-completed", site: "Geodis Hub B, Memphis, TN", street: "900 Harbor Ave", city: "Memphis", state: "TN", zip: "38103", country: "USA", salesOrder: "OK-512", hours: 1.5, expenses: 0, hr: 70, prim: "Hourly", sec: "Standard", refs: "OK-512", comments: "Printer maintenance done.", pickupDate: -10, startT: -9, endT: -9 },
      { ticket: "TA-1012", clientIdx: 1, platform: "OnForce", engIdx: 5, status: "open-pending", site: "Apex Store #102, Frisco, TX", street: "3500 Parkwood Blvd", city: "Frisco", state: "TX", zip: "75034", country: "USA", salesOrder: "RF-203", hours: 3, expenses: 18, hr: 80, prim: "Hourly", sec: "Standard", refs: "RF-203", comments: "RFID reader install.", pickupDate: 0, startT: 0, endT: 0 },
    ];
    for (const s of samples) {
      const client = clients[s.clientIdx];
      const eng = engineers[s.engIdx];
      const platform = platforms.find((p) => p.name === s.platform) || platforms[0];
      const baseDate = Date.now();
      await db.workOrder.create({
        data: {
          ticketId: s.ticket,
          clientId: client.id,
          clientName: client.name,
          jobPlatformId: platform.id,
          jobPlatformName: platform.name,
          status: s.status,
          customerReferences: s.refs,
          siteLocation: s.site,
          streetAddress: s.street,
          city: s.city,
          state: s.state,
          zipCode: s.zip,
          country: s.country || "USA",
          salesOrder: s.salesOrder,
          etaDlaDate: s.pickupDate != null ? new Date(baseDate + s.pickupDate * 86400000) : null,
          workedStartTime: s.startT != null ? new Date(baseDate + s.startT * 86400000 + 8 * 3600000) : null,
          workedEndTime: s.endT != null ? new Date(baseDate + s.endT * 86400000 + (8 + s.hours) * 3600000) : null,
          payRatePrimary: s.prim,
          payRateSecondary: s.sec,
          fieldEngineerId: eng.id,
          fieldEngineerName: eng.name,
          hours: s.hours,
          expenses: s.expenses,
          incurredExpenses: Math.round(s.expenses * 0.4),
          hourlyRate: s.hr,
          comments: s.comments,
          notes: JSON.stringify([]),
          dateCreated: new Date(baseDate - Math.floor(Math.random() * 20) * 86400000),
          dateModified: new Date(),
        },
      });
    }
  }

  // 7. Sample invoices
  const invCount = await db.invoice.count();
  if (invCount === 0) {
    const wos = await db.workOrder.findMany({ take: 4 });
    let invNum = 5001;
    for (const wo of wos) {
      const subtotal = wo.hours * wo.hourlyRate + wo.expenses + wo.incurredExpenses;
      const taxRate = 0.0;
      const tax = subtotal * taxRate;
      const total = subtotal + tax;
      const statusList = ["Draft", "Pending", "Paid", "Overdue"];
      await db.invoice.create({
        data: {
          invoiceNumber: `INV-${invNum++}`,
          clientId: wo.clientId,
          clientName: wo.clientName,
          workOrderIds: JSON.stringify([wo.id]),
          vendorName: "Techadox",
          vendorAddress: "261 Chapman Road, Suite 104 A, Newark, DE 19702",
          vendorTaxId: "TX-882-4490",
          billToName: wo.clientName,
          billToAddress: "",
          lineItems: JSON.stringify([
            { description: `Labor (${wo.hours} hrs @ $${wo.hourlyRate}/hr)`, quantity: wo.hours, rate: wo.hourlyRate, amount: wo.hours * wo.hourlyRate },
            { description: "Technician Expenses", quantity: 1, rate: wo.expenses, amount: wo.expenses },
            { description: "Incurred Expenses", quantity: 1, rate: wo.incurredExpenses, amount: wo.incurredExpenses },
          ]),
          taxRate,
          notes: "Payment due within 30 days.",
          signature: "",
          status: statusList[invNum % statusList.length],
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 86400000),
          subtotal,
          tax,
          total,
          jobPlatformName: wo.jobPlatformName,
          payRatePrimary: wo.payRatePrimary,
          payRateSecondary: wo.payRateSecondary,
          fieldEngineerName: wo.fieldEngineerName,
        },
      });
    }
  }
}

export async function clearWorkOrderData(sections?: Record<string, boolean>) {
  if (sections) {
    if (sections.attachments) await db.attachment.deleteMany();
    if (sections.workOrders) await db.workOrder.deleteMany();
    if (sections.invoices) await db.invoice.deleteMany();
    if (sections.payments) await db.payment.deleteMany();
  } else {
    await db.attachment.deleteMany();
    await db.workOrder.deleteMany();
    await db.invoice.deleteMany();
    await db.payment.deleteMany();
  }
}

export async function seedDatabaseSections(sections: Record<string, boolean>) {
  // Always seed roles/platforms first (dependencies)
  if (sections.platforms) {
    for (const name of JOB_PLATFORMS_SEED) {
      const exists = await db.jobPlatform.findFirst({ where: { name } });
      if (!exists) await db.jobPlatform.create({ data: { name } });
    }
  }

  if (sections.clients) {
    const clientDefs = [
      { name: "Geodis Logistics", address: "120 Logistics Way, Memphis, TN 38116", contactName: "Marcus Reed", contactEmail: "mreed@geodis.com", contactPhone: "+1 (901) 555-0142" },
      { name: "Apex Retail Group", address: "880 Commerce Blvd, Dallas, TX 75201", contactName: "Lena Park", contactEmail: "lena.park@apexretail.com", contactPhone: "+1 (214) 555-0188" },
      { name: "Northwind Healthcare", address: "45 Medical Center Dr, Phoenix, AZ 85012", contactName: "Dr. Sam Whitfield", contactEmail: "swhitfield@northwindhc.com", contactPhone: "+1 (602) 555-0123" },
      { name: "Crestline Banking Corp", address: "200 Financial Plaza, Charlotte, NC 28202", contactName: "Priya Nair", contactEmail: "pnair@crestlinebank.com", contactPhone: "+1 (704) 555-0177" },
      { name: "Summit Manufacturing", address: "15 Industrial Pkwy, Columbus, OH 43215", contactName: "Hugo Castillo", contactEmail: "hcastillo@summitmfg.com", contactPhone: "+1 (614) 555-0199" },
    ];
    for (const c of clientDefs) {
      const exists = await db.client.findFirst({ where: { name: c.name } });
      if (!exists) await db.client.create({ data: c });
    }
  }

  if (sections.engineers) {
    const engineerDefs = [
      { name: "James Carter", email: "jcarter@techadox.com", phone: "+1 (302) 555-0101", specialization: "Networking" },
      { name: "Sofia Ramirez", email: "sramirez@techadox.net", phone: "+1 (302) 555-0102", specialization: "POS Systems" },
      { name: "David Kim", email: "dkim@techadox.com", phone: "+1 (302) 555-0103", specialization: "CCTV / Security" },
      { name: "Aisha Mohammed", email: "amohammed@techadox.net", phone: "+1 (302) 555-0104", specialization: "Server Hardware" },
      { name: "Tom Brennan", email: "tbrennan@techadox.com", phone: "+1 (302) 555-0105", specialization: "Printers & Peripherals" },
      { name: "Nina Petrova", email: "npetrova@techadox.net", phone: "+1 (302) 555-0106", specialization: "RFID / Wireless" },
    ];
    for (const e of engineerDefs) {
      const exists = await db.fieldEngineer.findFirst({ where: { name: e.name } });
      if (!exists) await db.fieldEngineer.create({ data: e });
    }
  }

  if (sections.workOrders) {
    const platforms = await db.jobPlatform.findMany();
    const clients = await db.client.findMany();
    const engineers = await db.fieldEngineer.findMany();

    if (platforms.length > 0 && clients.length > 0 && engineers.length > 0) {
      const woCount = await db.workOrder.count();
      if (woCount === 0) {
        const samples = [
          { ticket: "TA-1001", clientIdx: 0, platform: "FieldNation", engIdx: 0, status: "open-pending", site: "Memphis Hub A, TN", street: "120 Logistics Way", city: "Memphis", state: "TN", zip: "38116", country: "USA", salesOrder: "RMA-44821", hours: 4, expenses: 25, hr: 85, prim: "Hourly", sec: "Standard", refs: "RMA-44821", comments: "Install replacement router at dock 7.", pickupDate: -2, startT: -1, endT: -1 },
          { ticket: "TA-1002", clientIdx: 1, platform: "WorkMarket", engIdx: 1, status: "in-process-billing", site: "Apex Store #214, Dallas, TX", street: "880 Commerce Blvd", city: "Dallas", state: "TX", zip: "75201", country: "USA", salesOrder: "PO-9921", hours: 2.5, expenses: 12, hr: 75, prim: "Hourly", sec: "After Hours", refs: "PO-9921", comments: "POS terminal swap, after hours.", pickupDate: -3, startT: -2, endT: -2 },
          { ticket: "TA-1003", clientIdx: 2, platform: "Direct Client", engIdx: 2, status: "action-required", site: "Northwind Clinic, Phoenix, AZ", street: "45 Medical Center Dr", city: "Phoenix", state: "AZ", zip: "85012", country: "USA", salesOrder: "TICKET-771", hours: 6, expenses: 40, hr: 90, prim: "Hourly", sec: "Emergency", refs: "TICKET-771", comments: "CCTV DVR failure, awaiting parts.", pickupDate: -5, startT: -4, endT: -4 },
          { ticket: "TA-1004", clientIdx: 3, platform: "OnForce", engIdx: 3, status: "ticket-completed", site: "Crestline HQ, Charlotte, NC", street: "200 Financial Plaza", city: "Charlotte", state: "NC", zip: "28202", country: "USA", salesOrder: "WO-5532", hours: 3, expenses: 0, hr: 95, prim: "Flat Rate", sec: "Standard", refs: "WO-5532", comments: "Server RAM upgrade completed.", pickupDate: -7, startT: -6, endT: -6 },
          { ticket: "TA-1005", clientIdx: 4, platform: "FieldNation", engIdx: 4, status: "open-not-posted", site: "Summit Plant 2, Columbus, OH", street: "15 Industrial Pkwy", city: "Columbus", state: "OH", zip: "43215", country: "USA", salesOrder: "REQ-118", hours: 0, expenses: 0, hr: 70, prim: "Hourly", sec: "Weekend", refs: "REQ-118", comments: "Printer queue issue, scheduled weekend.", pickupDate: 1, startT: null, endT: null },
          { ticket: "TA-1006", clientIdx: 0, platform: "B2X", engIdx: 5, status: "tech-cancelled", site: "Geodis Cross-Dock, TN", street: "3400 Distribution Ave", city: "Memphis", state: "TN", zip: "38118", country: "USA", salesOrder: "CX-301", hours: 1, expenses: 15, hr: 80, prim: "Hourly", sec: "Travel", refs: "CX-301", comments: "Engineer cancelled - site access denied.", pickupDate: -4, startT: -3, endT: -3 },
          { ticket: "TA-1007", clientIdx: 1, platform: "WorkMarket", engIdx: 0, status: "cancelled", site: "Apex Store #88, Plano, TX", street: "2200 Preston Rd", city: "Plano", state: "TX", zip: "75024", country: "USA", salesOrder: "CNL-44", hours: 0, expenses: 0, hr: 75, prim: "Hourly", sec: "Standard", refs: "CNL-44", comments: "Cancelled by client, reschedule TBD.", pickupDate: null, startT: null, endT: null },
          { ticket: "TA-1008", clientIdx: 2, platform: "Internal", engIdx: 1, status: "open-pending", site: "Northwind Annex, Phoenix, AZ", street: "510 Wellness Way", city: "Phoenix", state: "AZ", zip: "85004", country: "USA", salesOrder: "INT-09", hours: 2, expenses: 8, hr: 85, prim: "Hourly", sec: "Standard", refs: "INT-09", comments: "Wireless AP deployment.", pickupDate: -1, startT: 0, endT: 0 },
          { ticket: "TA-1009", clientIdx: 3, platform: "FieldNation", engIdx: 2, status: "in-process-billing", site: "Crestline Branch 4, NC", street: "1050 Park Rd", city: "Charlotte", state: "NC", zip: "28210", country: "USA", salesOrder: "BL-227", hours: 5, expenses: 30, hr: 90, prim: "Hourly", sec: "After Hours", refs: "BL-227", comments: "Security cam repositioning.", pickupDate: -6, startT: -5, endT: -5 },
          { ticket: "TA-1010", clientIdx: 4, platform: "Direct Client", engIdx: 3, status: "action-required", site: "Summit Plant 1, Columbus, OH", street: "500 Manufacturing Dr", city: "Columbus", state: "OH", zip: "43228", country: "USA", salesOrder: "DC-77", hours: 4, expenses: 22, hr: 95, prim: "Project Based", sec: "Standard", refs: "DC-77", comments: "Server rack rewire, awaiting approval.", pickupDate: -8, startT: -7, endT: -7 },
          { ticket: "TA-1011", clientIdx: 0, platform: "WorkMarket", engIdx: 4, status: "ticket-completed", site: "Geodis Hub B, Memphis, TN", street: "900 Harbor Ave", city: "Memphis", state: "TN", zip: "38103", country: "USA", salesOrder: "OK-512", hours: 1.5, expenses: 0, hr: 70, prim: "Hourly", sec: "Standard", refs: "OK-512", comments: "Printer maintenance done.", pickupDate: -10, startT: -9, endT: -9 },
          { ticket: "TA-1012", clientIdx: 1, platform: "OnForce", engIdx: 5, status: "open-pending", site: "Apex Store #102, Frisco, TX", street: "3500 Parkwood Blvd", city: "Frisco", state: "TX", zip: "75034", country: "USA", salesOrder: "RF-203", hours: 3, expenses: 18, hr: 80, prim: "Hourly", sec: "Standard", refs: "RF-203", comments: "RFID reader install.", pickupDate: 0, startT: 0, endT: 0 },
        ];
        for (const s of samples) {
          const client = clients[s.clientIdx % clients.length];
          const eng = engineers[s.engIdx % engineers.length];
          const platform = platforms.find((p) => p.name === s.platform) || platforms[0];
          const baseDate = Date.now();
          await db.workOrder.create({
            data: {
              ticketId: s.ticket,
              clientId: client.id,
              clientName: client.name,
              jobPlatformId: platform.id,
              jobPlatformName: platform.name,
              status: s.status,
              customerReferences: s.refs,
              siteLocation: s.site,
              streetAddress: s.street,
              city: s.city,
              state: s.state,
              zipCode: s.zip,
              country: s.country || "USA",
              salesOrder: s.salesOrder,
              etaDlaDate: s.pickupDate != null ? new Date(baseDate + s.pickupDate * 86400000) : null,
              workedStartTime: s.startT != null ? new Date(baseDate + s.startT * 86400000 + 8 * 3600000) : null,
              workedEndTime: s.endT != null ? new Date(baseDate + s.endT * 86400000 + (8 + s.hours) * 3600000) : null,
              payRatePrimary: s.prim,
              payRateSecondary: s.sec,
              fieldEngineerId: eng.id,
              fieldEngineerName: eng.name,
              hours: s.hours,
              expenses: s.expenses,
              incurredExpenses: Math.round(s.expenses * 0.4),
              hourlyRate: s.hr,
              comments: s.comments,
              notes: JSON.stringify([]),
              dateCreated: new Date(baseDate - Math.floor(Math.random() * 20) * 86400000),
              dateModified: new Date(),
            },
          });
        }
      }
    }
  }

  if (sections.invoices) {
    const wos = await db.workOrder.findMany({ take: 4 });
    const invCount = await db.invoice.count();
    if (invCount === 0 && wos.length > 0) {
      let invNum = 5001;
      for (const wo of wos) {
        const subtotal = wo.hours * wo.hourlyRate + wo.expenses + wo.incurredExpenses;
        const taxRate = 0.0;
        const tax = subtotal * taxRate;
        const total = subtotal + tax;
        const statusList = ["Draft", "Pending", "Paid", "Overdue"];
        await db.invoice.create({
          data: {
            invoiceNumber: `INV-${invNum++}`,
            clientId: wo.clientId,
            clientName: wo.clientName,
            workOrderIds: JSON.stringify([wo.id]),
            vendorName: "Techadox",
            vendorAddress: "261 Chapman Road, Suite 104 A, Newark, DE 19702",
            vendorTaxId: "TX-882-4490",
            billToName: wo.clientName,
            billToAddress: "",
            lineItems: JSON.stringify([
              { description: `Labor (${wo.hours} hrs @ $${wo.hourlyRate}/hr)`, quantity: wo.hours, rate: wo.hourlyRate, amount: wo.hours * wo.hourlyRate },
              { description: "Technician Expenses", quantity: 1, rate: wo.expenses, amount: wo.expenses },
              { description: "Incurred Expenses", quantity: 1, rate: wo.incurredExpenses, amount: wo.incurredExpenses },
            ]),
            taxRate,
            notes: "Payment due within 30 days.",
            signature: "",
            status: statusList[invNum % statusList.length],
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 86400000),
            subtotal,
            tax,
            total,
            jobPlatformName: wo.jobPlatformName,
            payRatePrimary: wo.payRatePrimary,
            payRateSecondary: wo.payRateSecondary,
            fieldEngineerName: wo.fieldEngineerName,
          },
        });
      }
    }
  }
}
