-- CreateTable
CREATE TABLE IF NOT EXISTS "TransportSafetyAlert" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "alertNumber" TEXT NOT NULL,
    "alertType" TEXT NOT NULL DEFAULT 'ACCIDENT',
    "severity" TEXT NOT NULL DEFAULT 'HIGH',
    "source" TEXT NOT NULL DEFAULT 'GPS_AUTO',
    "vehicleId" TEXT,
    "tripId" TEXT,
    "driverName" TEXT NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "longitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "locationLabel" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL,
    "autoTriggered" BOOLEAN NOT NULL DEFAULT true,
    "gpsImpactG" DOUBLE PRECISION,
    "speedAtEvent" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT NOT NULL DEFAULT '',
    "acknowledgedAt" TIMESTAMP(3),
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportSafetyAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransportSafetyReport" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "reportNumber" TEXT NOT NULL,
    "reportType" TEXT NOT NULL DEFAULT 'ACCIDENT',
    "source" TEXT NOT NULL DEFAULT 'MOBILE_APP',
    "vehicleId" TEXT,
    "tripId" TEXT,
    "alertId" TEXT,
    "reportedBy" TEXT NOT NULL DEFAULT '',
    "reporterRole" TEXT NOT NULL DEFAULT 'DRIVER',
    "description" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "longitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "locationLabel" TEXT NOT NULL DEFAULT '',
    "imageUrls" JSONB NOT NULL DEFAULT '[]',
    "injuryReported" BOOLEAN NOT NULL DEFAULT false,
    "policeNotified" BOOLEAN NOT NULL DEFAULT false,
    "parentNotified" BOOLEAN NOT NULL DEFAULT false,
    "studentsInvolved" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reviewedBy" TEXT NOT NULL DEFAULT '',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportSafetyReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransportSafetySettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "autoAccidentTrigger" BOOLEAN NOT NULL DEFAULT true,
    "gpsImpactThresholdG" DOUBLE PRECISION NOT NULL DEFAULT 3.5,
    "speedViolationKmh" INTEGER NOT NULL DEFAULT 60,
    "escalationMinutes" INTEGER NOT NULL DEFAULT 5,
    "autoNotifyParents" BOOLEAN NOT NULL DEFAULT true,
    "autoNotifyPrincipal" BOOLEAN NOT NULL DEFAULT true,
    "roleMatrix" JSONB NOT NULL DEFAULT '[]',
    "notificationRules" JSONB NOT NULL DEFAULT '{}',
    "mobileSyncRules" JSONB NOT NULL DEFAULT '{}',
    "autoTriggerRules" JSONB NOT NULL DEFAULT '{}',
    "reportCatalog" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportSafetySettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransportSafetyAuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT 'Safety Officer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportSafetyAuditLog_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "TransportSafetyAlert_institutionId_alertNumber_key" ON "TransportSafetyAlert"("institutionId", "alertNumber");
CREATE INDEX IF NOT EXISTS "TransportSafetyAlert_institutionId_status_createdAt_idx" ON "TransportSafetyAlert"("institutionId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "TransportSafetyAlert_institutionId_alertType_idx" ON "TransportSafetyAlert"("institutionId", "alertType");
CREATE INDEX IF NOT EXISTS "TransportSafetyAlert_vehicleId_createdAt_idx" ON "TransportSafetyAlert"("vehicleId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "TransportSafetyReport_institutionId_reportNumber_key" ON "TransportSafetyReport"("institutionId", "reportNumber");
CREATE INDEX IF NOT EXISTS "TransportSafetyReport_institutionId_reportType_createdAt_idx" ON "TransportSafetyReport"("institutionId", "reportType", "createdAt");
CREATE INDEX IF NOT EXISTS "TransportSafetyReport_vehicleId_createdAt_idx" ON "TransportSafetyReport"("vehicleId", "createdAt");
CREATE INDEX IF NOT EXISTS "TransportSafetyReport_alertId_idx" ON "TransportSafetyReport"("alertId");

CREATE UNIQUE INDEX IF NOT EXISTS "TransportSafetySettings_institutionId_key" ON "TransportSafetySettings"("institutionId");

CREATE INDEX IF NOT EXISTS "TransportSafetyAuditLog_institutionId_createdAt_idx" ON "TransportSafetyAuditLog"("institutionId", "createdAt");

-- ForeignKeys
ALTER TABLE "TransportSafetyAlert" ADD CONSTRAINT "TransportSafetyAlert_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportSafetyAlert" ADD CONSTRAINT "TransportSafetyAlert_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportSafetyAlert" ADD CONSTRAINT "TransportSafetyAlert_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "TransportTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransportSafetyReport" ADD CONSTRAINT "TransportSafetyReport_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportSafetyReport" ADD CONSTRAINT "TransportSafetyReport_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportSafetyReport" ADD CONSTRAINT "TransportSafetyReport_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "TransportTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportSafetyReport" ADD CONSTRAINT "TransportSafetyReport_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "TransportSafetyAlert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransportSafetySettings" ADD CONSTRAINT "TransportSafetySettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportSafetyAuditLog" ADD CONSTRAINT "TransportSafetyAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
