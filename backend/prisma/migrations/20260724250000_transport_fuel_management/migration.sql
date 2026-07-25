-- AlterTable: extend fleet fuel entries
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "fillTime" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "openingOdometer" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "closingOdometer" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "distanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "fuelStationId" TEXT;
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "fuelCardId" TEXT;
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "fuelRequestId" TEXT;
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "tripId" TEXT;
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "driverId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "fuelType" TEXT NOT NULL DEFAULT 'Diesel';
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "quantityUnit" TEXT NOT NULL DEFAULT 'LITRE';
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "expectedMileage" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "actualMileage" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "deviceFuelReading" DOUBLE PRECISION;
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "deviceDistanceKm" DOUBLE PRECISION;
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "anomalyFlag" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "anomalyReason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFleetFuelEntry" ADD COLUMN IF NOT EXISTS "entrySource" TEXT NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE IF NOT EXISTS "TransportFuelStation" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "stationCode" TEXT NOT NULL,
    "stationName" TEXT NOT NULL,
    "stationType" TEXT NOT NULL DEFAULT 'EXTERNAL',
    "address" TEXT NOT NULL DEFAULT '',
    "contactPerson" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "fuelTypes" JSONB NOT NULL DEFAULT '["Diesel","Petrol"]',
    "latitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "longitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deviceIntegrationId" TEXT NOT NULL DEFAULT '',
    "deviceStatus" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportFuelStation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransportFuelCard" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "cardProvider" TEXT NOT NULL DEFAULT 'HPCL',
    "vehicleId" TEXT,
    "driverId" TEXT,
    "assignedTo" TEXT NOT NULL DEFAULT '',
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "balanceUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expiryDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportFuelCard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransportFuelRequest" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "driverName" TEXT NOT NULL DEFAULT '',
    "tripId" TEXT,
    "fuelCardId" TEXT,
    "requestedLitres" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requestedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuelType" TEXT NOT NULL DEFAULT 'Diesel',
    "purpose" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportFuelRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransportFuelMileageLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "tripId" TEXT,
    "driverName" TEXT NOT NULL DEFAULT '',
    "logDate" DATE NOT NULL,
    "openingOdometer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closingOdometer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuelConsumed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuelType" TEXT NOT NULL DEFAULT 'Diesel',
    "quantityUnit" TEXT NOT NULL DEFAULT 'LITRE',
    "expectedMileage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualMileage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variancePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deviceDistanceKm" DOUBLE PRECISION,
    "deviceFuelUsed" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportFuelMileageLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransportFuelAnomaly" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "anomalyType" TEXT NOT NULL DEFAULT 'THEFT_SUSPECTED',
    "severity" TEXT NOT NULL DEFAULT 'HIGH',
    "description" TEXT NOT NULL,
    "expectedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variancePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedBy" TEXT NOT NULL DEFAULT '',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportFuelAnomaly_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransportFuelSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "defaultExpectedMileage" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "anomalyThresholdPct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "cngMileageKmPerKg" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "deviceIntegrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoApproveLimit" DOUBLE PRECISION NOT NULL DEFAULT 3000,
    "roleMatrix" JSONB NOT NULL DEFAULT '[]',
    "notificationRules" JSONB NOT NULL DEFAULT '{}',
    "mobileSyncRules" JSONB NOT NULL DEFAULT '{}',
    "deviceIntegrationRules" JSONB NOT NULL DEFAULT '{}',
    "reportCatalog" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportFuelSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransportFuelAuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT 'Transport Manager',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportFuelAuditLog_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "TransportFuelStation_institutionId_stationCode_key" ON "TransportFuelStation"("institutionId", "stationCode");
CREATE INDEX IF NOT EXISTS "TransportFuelStation_institutionId_stationType_idx" ON "TransportFuelStation"("institutionId", "stationType");

CREATE UNIQUE INDEX IF NOT EXISTS "TransportFuelCard_institutionId_cardNumber_key" ON "TransportFuelCard"("institutionId", "cardNumber");
CREATE INDEX IF NOT EXISTS "TransportFuelCard_institutionId_status_idx" ON "TransportFuelCard"("institutionId", "status");
CREATE INDEX IF NOT EXISTS "TransportFuelCard_vehicleId_idx" ON "TransportFuelCard"("vehicleId");

CREATE UNIQUE INDEX IF NOT EXISTS "TransportFuelRequest_institutionId_requestNumber_key" ON "TransportFuelRequest"("institutionId", "requestNumber");
CREATE INDEX IF NOT EXISTS "TransportFuelRequest_institutionId_status_idx" ON "TransportFuelRequest"("institutionId", "status");
CREATE INDEX IF NOT EXISTS "TransportFuelRequest_vehicleId_idx" ON "TransportFuelRequest"("vehicleId");

CREATE INDEX IF NOT EXISTS "TransportFuelMileageLog_institutionId_logDate_idx" ON "TransportFuelMileageLog"("institutionId", "logDate");
CREATE INDEX IF NOT EXISTS "TransportFuelMileageLog_vehicleId_logDate_idx" ON "TransportFuelMileageLog"("vehicleId", "logDate");
CREATE INDEX IF NOT EXISTS "TransportFuelMileageLog_tripId_idx" ON "TransportFuelMileageLog"("tripId");

CREATE INDEX IF NOT EXISTS "TransportFuelAnomaly_institutionId_status_idx" ON "TransportFuelAnomaly"("institutionId", "status");
CREATE INDEX IF NOT EXISTS "TransportFuelAnomaly_vehicleId_detectedAt_idx" ON "TransportFuelAnomaly"("vehicleId", "detectedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "TransportFuelSettings_institutionId_key" ON "TransportFuelSettings"("institutionId");

CREATE INDEX IF NOT EXISTS "TransportFuelAuditLog_institutionId_createdAt_idx" ON "TransportFuelAuditLog"("institutionId", "createdAt");

CREATE INDEX IF NOT EXISTS "TransportFleetFuelEntry_institutionId_anomalyFlag_idx" ON "TransportFleetFuelEntry"("institutionId", "anomalyFlag");

-- ForeignKeys
ALTER TABLE "TransportFleetFuelEntry" ADD CONSTRAINT "TransportFleetFuelEntry_fuelStationId_fkey" FOREIGN KEY ("fuelStationId") REFERENCES "TransportFuelStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportFleetFuelEntry" ADD CONSTRAINT "TransportFleetFuelEntry_fuelCardId_fkey" FOREIGN KEY ("fuelCardId") REFERENCES "TransportFuelCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportFleetFuelEntry" ADD CONSTRAINT "TransportFleetFuelEntry_fuelRequestId_fkey" FOREIGN KEY ("fuelRequestId") REFERENCES "TransportFuelRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportFleetFuelEntry" ADD CONSTRAINT "TransportFleetFuelEntry_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "TransportTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransportFuelStation" ADD CONSTRAINT "TransportFuelStation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportFuelCard" ADD CONSTRAINT "TransportFuelCard_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFuelCard" ADD CONSTRAINT "TransportFuelCard_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportFuelCard" ADD CONSTRAINT "TransportFuelCard_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "TransportStaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransportFuelRequest" ADD CONSTRAINT "TransportFuelRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFuelRequest" ADD CONSTRAINT "TransportFuelRequest_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFuelRequest" ADD CONSTRAINT "TransportFuelRequest_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "TransportStaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportFuelRequest" ADD CONSTRAINT "TransportFuelRequest_fuelCardId_fkey" FOREIGN KEY ("fuelCardId") REFERENCES "TransportFuelCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransportFuelMileageLog" ADD CONSTRAINT "TransportFuelMileageLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFuelMileageLog" ADD CONSTRAINT "TransportFuelMileageLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFuelMileageLog" ADD CONSTRAINT "TransportFuelMileageLog_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "TransportTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransportFuelAnomaly" ADD CONSTRAINT "TransportFuelAnomaly_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFuelAnomaly" ADD CONSTRAINT "TransportFuelAnomaly_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportFuelSettings" ADD CONSTRAINT "TransportFuelSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportFuelAuditLog" ADD CONSTRAINT "TransportFuelAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
