ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "ticketNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "raisedBy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "raisedByRole" TEXT NOT NULL DEFAULT 'WARDEN';
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "studentId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "studentProfileId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "facilityManagerName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "assignedAt" TIMESTAMP(3);
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "assignedTechnicianId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "assignedTechnicianName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "workStartedAt" TIMESTAMP(3);
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "fixNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "resolvedBy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "closedAt" TIMESTAMP(3);
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "closedBy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "academicYear" TEXT NOT NULL DEFAULT '2025-26';
ALTER TABLE "HostelMaintenanceRequest" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "HostelInventoryItem" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "stockQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderLevel" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "hostelId" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelInventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelMaintenancePartUsage" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "maintenanceId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL DEFAULT '',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "deductedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deductedBy" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "HostelMaintenancePartUsage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelMaintenanceAuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "maintenanceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL DEFAULT '',
    "toStatus" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelMaintenanceAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HostelMaintenanceRequest_institutionId_academicYear_status_idx" ON "HostelMaintenanceRequest"("institutionId", "academicYear", "status");
CREATE INDEX "HostelMaintenanceRequest_ticketNumber_idx" ON "HostelMaintenanceRequest"("ticketNumber");
CREATE UNIQUE INDEX "HostelInventoryItem_institutionId_itemCode_key" ON "HostelInventoryItem"("institutionId", "itemCode");
CREATE INDEX "HostelInventoryItem_institutionId_academicYear_status_idx" ON "HostelInventoryItem"("institutionId", "academicYear", "status");
CREATE INDEX "HostelMaintenancePartUsage_institutionId_maintenanceId_idx" ON "HostelMaintenancePartUsage"("institutionId", "maintenanceId");
CREATE INDEX "HostelMaintenancePartUsage_inventoryItemId_idx" ON "HostelMaintenancePartUsage"("inventoryItemId");
CREATE INDEX "HostelMaintenanceAuditLog_institutionId_maintenanceId_idx" ON "HostelMaintenanceAuditLog"("institutionId", "maintenanceId");
CREATE INDEX "HostelMaintenanceAuditLog_institutionId_createdAt_idx" ON "HostelMaintenanceAuditLog"("institutionId", "createdAt");

ALTER TABLE "HostelInventoryItem" ADD CONSTRAINT "HostelInventoryItem_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelMaintenancePartUsage" ADD CONSTRAINT "HostelMaintenancePartUsage_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelMaintenancePartUsage" ADD CONSTRAINT "HostelMaintenancePartUsage_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "HostelMaintenanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelMaintenancePartUsage" ADD CONSTRAINT "HostelMaintenancePartUsage_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "HostelInventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelMaintenanceAuditLog" ADD CONSTRAINT "HostelMaintenanceAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelMaintenanceAuditLog" ADD CONSTRAINT "HostelMaintenanceAuditLog_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "HostelMaintenanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
