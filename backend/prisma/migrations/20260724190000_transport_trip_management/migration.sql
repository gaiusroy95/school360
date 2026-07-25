-- Trip Management module

ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "tripNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "tripCategory" TEXT NOT NULL DEFAULT 'Morning Pickup';
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "tripDirection" TEXT NOT NULL DEFAULT 'Round Trip';
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "scheduleType" TEXT NOT NULL DEFAULT 'DAILY';
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "academicYear" TEXT NOT NULL DEFAULT '2025-26';
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "branch" TEXT NOT NULL DEFAULT 'Main Campus';
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "workflowStage" TEXT NOT NULL DEFAULT 'SCHEDULED';
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "routeId" TEXT;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "vehicleId" TEXT;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "driverId" TEXT;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "attendantId" TEXT;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "backupVehicleId" TEXT;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "backupDriverId" TEXT;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "plannedDeparture" TEXT NOT NULL DEFAULT '07:00';
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "plannedArrival" TEXT NOT NULL DEFAULT '08:30';
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "actualDeparture" TIMESTAMP(3);
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "actualArrival" TIMESTAMP(3);
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3);
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "studentsBoarded" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "studentsDropped" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "odometerStart" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "odometerEnd" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "fuelLevelStart" DOUBLE PRECISION;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "fuelConsumption" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "distanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "mileageKm" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "delayMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "tripCost" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "tollExpense" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "parkingExpense" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "miscExpense" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "preTripChecklist" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "postTripChecklist" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "driverHealthDeclared" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "routeValidated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "tripNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "reconciliationNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION;
ALTER TABLE "TransportTrip" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

UPDATE "TransportTrip" SET "tripNumber" = 'TRP-' || LEFT("id", 8) WHERE "tripNumber" = '' OR "tripNumber" IS NULL;
UPDATE "TransportTrip" SET "status" = 'COMPLETED' WHERE "status" = 'On Time';
UPDATE "TransportTrip" SET "status" = 'SCHEDULED' WHERE "status" NOT IN ('SCHEDULED','RUNNING','COMPLETED','DELAYED','CANCELLED','PAUSED','EMERGENCY');

CREATE UNIQUE INDEX IF NOT EXISTS "TransportTrip_institutionId_tripNumber_key" ON "TransportTrip"("institutionId", "tripNumber");
CREATE INDEX IF NOT EXISTS "TransportTrip_institutionId_status_tripDate_idx" ON "TransportTrip"("institutionId", "status", "tripDate");

ALTER TABLE "TransportTrip" ADD CONSTRAINT "TransportTrip_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportTrip" ADD CONSTRAINT "TransportTrip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportTrip" ADD CONSTRAINT "TransportTrip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "TransportStaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportTrip" ADD CONSTRAINT "TransportTrip_attendantId_fkey" FOREIGN KEY ("attendantId") REFERENCES "TransportStaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TransportTripStop" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "stopName" TEXT NOT NULL,
    "sequenceOrder" INTEGER NOT NULL DEFAULT 0,
    "plannedTime" TEXT NOT NULL DEFAULT '',
    "actualArrival" TIMESTAMP(3),
    "actualDeparture" TIMESTAMP(3),
    "studentsBoarded" INTEGER NOT NULL DEFAULT 0,
    "studentsDropped" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportTripStop_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportTripExpense" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "expenseType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportTripExpense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportTripIncident" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "incidentType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportTripIncident_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportTripSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "delayThresholdMin" INTEGER NOT NULL DEFAULT 10,
    "roleMatrix" JSONB NOT NULL DEFAULT '[]',
    "notificationRules" JSONB NOT NULL DEFAULT '{}',
    "mobileSyncRules" JSONB NOT NULL DEFAULT '{}',
    "reportCatalog" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportTripSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportTripAuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT 'Transport Manager',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransportTripAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TransportTripStop_tripId_sequenceOrder_idx" ON "TransportTripStop"("tripId", "sequenceOrder");
CREATE INDEX "TransportTripExpense_tripId_idx" ON "TransportTripExpense"("tripId");
CREATE INDEX "TransportTripIncident_tripId_idx" ON "TransportTripIncident"("tripId");
CREATE UNIQUE INDEX "TransportTripSettings_institutionId_key" ON "TransportTripSettings"("institutionId");
CREATE INDEX "TransportTripAuditLog_institutionId_createdAt_idx" ON "TransportTripAuditLog"("institutionId", "createdAt");

ALTER TABLE "TransportTripStop" ADD CONSTRAINT "TransportTripStop_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportTripStop" ADD CONSTRAINT "TransportTripStop_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "TransportTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportTripExpense" ADD CONSTRAINT "TransportTripExpense_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportTripExpense" ADD CONSTRAINT "TransportTripExpense_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "TransportTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportTripIncident" ADD CONSTRAINT "TransportTripIncident_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportTripIncident" ADD CONSTRAINT "TransportTripIncident_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "TransportTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportTripSettings" ADD CONSTRAINT "TransportTripSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportTripAuditLog" ADD CONSTRAINT "TransportTripAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
