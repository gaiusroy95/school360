-- Fleet Maintenance & Service module

CREATE TABLE IF NOT EXISTS "TransportFleetVendor" (
  "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "vendorCode" TEXT NOT NULL,
  "vendorName" TEXT NOT NULL, "vendorType" TEXT NOT NULL DEFAULT 'EXTERNAL',
  "contactPerson" TEXT NOT NULL DEFAULT '', "mobile" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '', "address" TEXT NOT NULL DEFAULT '',
  "amcContract" BOOLEAN NOT NULL DEFAULT false, "amcExpiry" DATE,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportFleetVendor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TransportFleetVendor_institutionId_vendorCode_key" ON "TransportFleetVendor"("institutionId", "vendorCode");

CREATE TABLE IF NOT EXISTS "TransportFleetWorkOrder" (
  "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "workOrderNumber" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL, "vendorId" TEXT, "serviceType" TEXT NOT NULL DEFAULT 'PREVENTIVE',
  "workshopType" TEXT NOT NULL DEFAULT 'INTERNAL', "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "status" TEXT NOT NULL DEFAULT 'OPEN', "scheduledDate" DATE, "completedDate" DATE,
  "odometerReading" DOUBLE PRECISION NOT NULL DEFAULT 0, "engineHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "labourCost" DOUBLE PRECISION NOT NULL DEFAULT 0, "partsCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "vendorCost" DOUBLE PRECISION NOT NULL DEFAULT 0, "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "description" TEXT NOT NULL DEFAULT '', "assignedTo" TEXT NOT NULL DEFAULT '',
  "qcPassed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportFleetWorkOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TransportFleetWorkOrder_institutionId_workOrderNumber_key" ON "TransportFleetWorkOrder"("institutionId", "workOrderNumber");
CREATE INDEX IF NOT EXISTS "TransportFleetWorkOrder_institutionId_status_idx" ON "TransportFleetWorkOrder"("institutionId", "status");

CREATE TABLE IF NOT EXISTS "TransportFleetServiceSchedule" (
  "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "vehicleId" TEXT NOT NULL,
  "scheduleType" TEXT NOT NULL DEFAULT 'KM', "serviceType" TEXT NOT NULL DEFAULT 'GENERAL_SERVICE',
  "intervalValue" INTEGER NOT NULL DEFAULT 5000, "lastServiceDate" DATE,
  "lastServiceKm" DOUBLE PRECISION NOT NULL DEFAULT 0, "nextDueDate" DATE,
  "nextDueKm" DOUBLE PRECISION NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "reminderSent" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportFleetServiceSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransportFleetComplianceDoc" (
  "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "vehicleId" TEXT NOT NULL,
  "docType" TEXT NOT NULL, "documentNumber" TEXT NOT NULL DEFAULT '',
  "issueDate" DATE, "expiryDate" DATE, "status" TEXT NOT NULL DEFAULT 'VALID',
  "reminderDays" INTEGER NOT NULL DEFAULT 30, "claimStatus" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportFleetComplianceDoc_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TransportFleetComplianceDoc_institutionId_docType_expiryDate_idx" ON "TransportFleetComplianceDoc"("institutionId", "docType", "expiryDate");

CREATE TABLE IF NOT EXISTS "TransportFleetFuelEntry" (
  "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "vehicleId" TEXT NOT NULL,
  "fillDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "litres" DOUBLE PRECISION NOT NULL DEFAULT 0, "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "odometerReading" DOUBLE PRECISION NOT NULL DEFAULT 0, "fuelStation" TEXT NOT NULL DEFAULT '',
  "paymentMode" TEXT NOT NULL DEFAULT 'CASH', "mileageKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "costPerLitre" DOUBLE PRECISION NOT NULL DEFAULT 0, "driverName" TEXT NOT NULL DEFAULT '',
  "receiptRef" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportFleetFuelEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TransportFleetFuelEntry_institutionId_fillDate_idx" ON "TransportFleetFuelEntry"("institutionId", "fillDate");

CREATE TABLE IF NOT EXISTS "TransportFleetSparePart" (
  "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "partCode" TEXT NOT NULL,
  "partName" TEXT NOT NULL, "category" TEXT NOT NULL DEFAULT 'GENERAL',
  "quantity" INTEGER NOT NULL DEFAULT 0, "reorderLevel" INTEGER NOT NULL DEFAULT 5,
  "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportFleetSparePart_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TransportFleetSparePart_institutionId_partCode_key" ON "TransportFleetSparePart"("institutionId", "partCode");

CREATE TABLE IF NOT EXISTS "TransportFleetInspection" (
  "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "vehicleId" TEXT NOT NULL,
  "inspectionType" TEXT NOT NULL DEFAULT 'DAILY', "checklist" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'PASS', "odometerReading" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "inspectorName" TEXT NOT NULL DEFAULT '', "defectsFound" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TransportFleetInspection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransportFleetTyre" (
  "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "vehicleId" TEXT NOT NULL,
  "tyreNumber" TEXT NOT NULL, "position" TEXT NOT NULL DEFAULT 'FRONT_LEFT',
  "brand" TEXT NOT NULL DEFAULT '', "installDate" DATE, "treadDepthMm" DOUBLE PRECISION NOT NULL DEFAULT 8,
  "expectedLifeKm" DOUBLE PRECISION NOT NULL DEFAULT 40000, "usedKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportFleetTyre_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransportFleetSettings" (
  "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL,
  "defaultServiceKm" INTEGER NOT NULL DEFAULT 5000, "defaultServiceDays" INTEGER NOT NULL DEFAULT 90,
  "reminderDaysBefore" INTEGER NOT NULL DEFAULT 7,
  "roleMatrix" JSONB NOT NULL DEFAULT '[]', "notificationRules" JSONB NOT NULL DEFAULT '{}',
  "mobileSyncRules" JSONB NOT NULL DEFAULT '{}', "reportCatalog" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportFleetSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TransportFleetSettings_institutionId_key" ON "TransportFleetSettings"("institutionId");

CREATE TABLE IF NOT EXISTS "TransportFleetAuditLog" (
  "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL DEFAULT '', "action" TEXT NOT NULL, "details" TEXT NOT NULL DEFAULT '',
  "performedBy" TEXT NOT NULL DEFAULT 'Fleet Manager', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TransportFleetAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TransportFleetAuditLog_institutionId_createdAt_idx" ON "TransportFleetAuditLog"("institutionId", "createdAt");

ALTER TABLE "TransportFleetVendor" ADD CONSTRAINT "TransportFleetVendor_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFleetWorkOrder" ADD CONSTRAINT "TransportFleetWorkOrder_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFleetWorkOrder" ADD CONSTRAINT "TransportFleetWorkOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFleetWorkOrder" ADD CONSTRAINT "TransportFleetWorkOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "TransportFleetVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportFleetServiceSchedule" ADD CONSTRAINT "TransportFleetServiceSchedule_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFleetServiceSchedule" ADD CONSTRAINT "TransportFleetServiceSchedule_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFleetComplianceDoc" ADD CONSTRAINT "TransportFleetComplianceDoc_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFleetComplianceDoc" ADD CONSTRAINT "TransportFleetComplianceDoc_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFleetFuelEntry" ADD CONSTRAINT "TransportFleetFuelEntry_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFleetFuelEntry" ADD CONSTRAINT "TransportFleetFuelEntry_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFleetSparePart" ADD CONSTRAINT "TransportFleetSparePart_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFleetInspection" ADD CONSTRAINT "TransportFleetInspection_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFleetInspection" ADD CONSTRAINT "TransportFleetInspection_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFleetTyre" ADD CONSTRAINT "TransportFleetTyre_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFleetTyre" ADD CONSTRAINT "TransportFleetTyre_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFleetSettings" ADD CONSTRAINT "TransportFleetSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFleetAuditLog" ADD CONSTRAINT "TransportFleetAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
