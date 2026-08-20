-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Dispatcher',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "phone" TEXT,
    "title" TEXT,
    "colorTheme" TEXT NOT NULL DEFAULT 'teal',
    "darkMode" BOOLEAN NOT NULL DEFAULT false,
    "columnOrder" TEXT NOT NULL DEFAULT '[]',
    "pageSize" INTEGER NOT NULL DEFAULT 10,
    "reportColumns" TEXT NOT NULL DEFAULT '[]',
    "reportColumnOrder" TEXT NOT NULL DEFAULT '[]',
    "notifyPrefs" TEXT NOT NULL DEFAULT '{}',
    "advancedAccounts" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldEngineer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "specialization" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldEngineer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPlatform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT NOT NULL DEFAULT '',
    "jobPlatformId" TEXT,
    "jobPlatformName" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Open / Pending',
    "customerReferences" TEXT NOT NULL DEFAULT '',
    "siteLocation" TEXT NOT NULL DEFAULT '',
    "streetAddress" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "zipCode" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT 'USA',
    "pickupSiteNotes" TEXT NOT NULL DEFAULT '',
    "deliverySiteNotes" TEXT NOT NULL DEFAULT '',
    "etaDlaDate" TIMESTAMP(3),
    "salesOrder" TEXT NOT NULL DEFAULT '',
    "taskNumber" TEXT NOT NULL DEFAULT '',
    "taskIds" TEXT,
    "serialNumber" TEXT NOT NULL DEFAULT '',
    "tdxCode" TEXT NOT NULL DEFAULT '',
    "payRatePrimary" TEXT NOT NULL DEFAULT '',
    "payRateSecondary" TEXT NOT NULL DEFAULT '',
    "fieldEngineerId" TEXT,
    "fieldEngineerName" TEXT NOT NULL DEFAULT '',
    "engineerPhone" TEXT NOT NULL DEFAULT '',
    "engineerContactAlt" TEXT NOT NULL DEFAULT '',
    "engineerEmail" TEXT NOT NULL DEFAULT '',
    "workedStartTime" TIMESTAMP(3),
    "workedEndTime" TIMESTAMP(3),
    "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualPickupDate" TIMESTAMP(3),
    "actualDeliveryDate" TIMESTAMP(3),
    "ticketReceivedTime" TIMESTAMP(3),
    "acknowledgementTime" TIMESTAMP(3),
    "technicianSubmittalTime" TIMESTAMP(3),
    "expenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "incurredExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "technicianExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "authorizedExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "billRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "editManually" BOOLEAN NOT NULL DEFAULT false,
    "approveStatusSigner" TEXT NOT NULL DEFAULT '',
    "comments" TEXT NOT NULL DEFAULT '',
    "closingNotes" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '[]',
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileData" BYTEA NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT NOT NULL DEFAULT '',
    "workOrderIds" TEXT NOT NULL DEFAULT '[]',
    "vendorName" TEXT NOT NULL DEFAULT 'Techadox',
    "vendorAddress" TEXT NOT NULL DEFAULT '261 Chapman Road, Suite 104 A, Newark, DE 19702',
    "vendorTaxId" TEXT NOT NULL DEFAULT '',
    "billToName" TEXT NOT NULL DEFAULT '',
    "billToAddress" TEXT NOT NULL DEFAULT '',
    "lineItems" TEXT NOT NULL DEFAULT '[]',
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "signature" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jobPlatformName" TEXT NOT NULL DEFAULT '',
    "payRatePrimary" TEXT NOT NULL DEFAULT '',
    "payRateSecondary" TEXT NOT NULL DEFAULT '',
    "fieldEngineerName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'Card',
    "status" TEXT NOT NULL DEFAULT 'Completed',
    "scheduledDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "permissions" TEXT NOT NULL DEFAULT '{}',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT NOT NULL DEFAULT '',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickBooksSyncLog" (
    "id" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL DEFAULT '',
    "qbId" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "summary" TEXT NOT NULL DEFAULT '',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuickBooksSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickBooksConnection" (
    "id" TEXT NOT NULL,
    "realmId" TEXT NOT NULL DEFAULT '',
    "accessToken" TEXT NOT NULL DEFAULT '',
    "refreshToken" TEXT NOT NULL DEFAULT '',
    "accountName" TEXT NOT NULL DEFAULT '',
    "connected" BOOLEAN NOT NULL DEFAULT true,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'idle',
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "QuickBooksConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "WorkOrder_etaDlaDate_idx" ON "WorkOrder"("etaDlaDate");

-- CreateIndex
CREATE INDEX "WorkOrder_dateCreated_idx" ON "WorkOrder"("dateCreated");

-- CreateIndex
CREATE INDEX "Attachment_workOrderId_idx" ON "Attachment"("workOrderId");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_fieldEngineerId_fkey" FOREIGN KEY ("fieldEngineerId") REFERENCES "FieldEngineer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
