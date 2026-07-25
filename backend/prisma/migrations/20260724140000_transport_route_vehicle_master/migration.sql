-- Route & Vehicle Master extensions

ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "registrationNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "vehicleType" TEXT NOT NULL DEFAULT 'Bus';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "capacity" INTEGER NOT NULL DEFAULT 40;
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "reserveSeats" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "vehicleCategory" TEXT NOT NULL DEFAULT 'Non-AC Owned';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "make" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "model" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "manufactureYear" INTEGER NOT NULL DEFAULT 2020;
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "engineNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "chassisNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "fuelType" TEXT NOT NULL DEFAULT 'Diesel';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "compliance" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "documents" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "photos" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "gpsDeviceId" TEXT;
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "mobileGpsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "liveTrackingEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "primaryDriverId" TEXT;
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "backupDriverId" TEXT;
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "attendantId" TEXT;
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "shiftType" TEXT NOT NULL DEFAULT 'DOUBLE';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "seatLayout" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "rfidEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "qrEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "cctvDetails" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "panicButtonMapped" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "speedLimitKmh" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "assignedRouteIds" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "availabilityStatus" TEXT NOT NULL DEFAULT 'AVAILABLE';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "TransportVehicle_institutionId_availabilityStatus_idx" ON "TransportVehicle"("institutionId", "availabilityStatus");

ALTER TABLE "TransportRoute" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportRoute" ADD COLUMN IF NOT EXISTS "routeType" TEXT NOT NULL DEFAULT 'Two-way';
ALTER TABLE "TransportRoute" ADD COLUMN IF NOT EXISTS "branch" TEXT NOT NULL DEFAULT 'Main Campus';
ALTER TABLE "TransportRoute" ADD COLUMN IF NOT EXISTS "academicYear" TEXT NOT NULL DEFAULT '2025-26';
ALTER TABLE "TransportRoute" ADD COLUMN IF NOT EXISTS "distanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransportRoute" ADD COLUMN IF NOT EXISTS "estimatedMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TransportRoute" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TransportRoute" ADD COLUMN IF NOT EXISTS "routeColor" TEXT NOT NULL DEFAULT '#3b82f6';
ALTER TABLE "TransportRoute" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "TransportRoute" ADD COLUMN IF NOT EXISTS "occupancyPct" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransportRoute" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TransportRoute" ADD COLUMN IF NOT EXISTS "clonedFromId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportRoute" ADD COLUMN IF NOT EXISTS "versionLabel" TEXT NOT NULL DEFAULT 'Primary';
ALTER TABLE "TransportRoute" ADD COLUMN IF NOT EXISTS "geoPath" JSONB NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS "TransportRoute_institutionId_status_idx" ON "TransportRoute"("institutionId", "status");
CREATE INDEX IF NOT EXISTS "TransportRoute_institutionId_academicYear_idx" ON "TransportRoute"("institutionId", "academicYear");

CREATE TABLE "TransportRouteStop" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "routeId" TEXT NOT NULL,
    "stopType" TEXT NOT NULL DEFAULT 'PICKUP', "stopName" TEXT NOT NULL,
    "sequenceOrder" INTEGER NOT NULL DEFAULT 1, "latitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "longitude" DOUBLE PRECISION NOT NULL DEFAULT 0, "landmark" TEXT NOT NULL DEFAULT '',
    "estimatedArrival" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportRouteStop_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportGpsDevice" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "deviceId" TEXT NOT NULL,
    "simNumber" TEXT NOT NULL DEFAULT '', "imei" TEXT NOT NULL DEFAULT '',
    "vendor" TEXT NOT NULL DEFAULT '', "connectivityStatus" TEXT NOT NULL DEFAULT 'ONLINE',
    "batteryLevel" INTEGER NOT NULL DEFAULT 100, "liveTrackingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportGpsDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportMasterAuditLog" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL, "entityLabel" TEXT NOT NULL DEFAULT '', "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL DEFAULT 'Transport Manager', "reason" TEXT NOT NULL DEFAULT '',
    "previousValue" TEXT NOT NULL DEFAULT '', "currentValue" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransportMasterAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportMasterSettings" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "routeCodePrefix" TEXT NOT NULL DEFAULT 'R',
    "autoRouteCode" BOOLEAN NOT NULL DEFAULT true, "roleMatrix" JSONB NOT NULL DEFAULT '[]',
    "notificationRules" JSONB NOT NULL DEFAULT '{}', "mobileSyncRules" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportMasterSettings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TransportRouteStop_routeId_sequenceOrder_idx" ON "TransportRouteStop"("routeId", "sequenceOrder");
CREATE INDEX "TransportRouteStop_institutionId_stopType_idx" ON "TransportRouteStop"("institutionId", "stopType");
CREATE UNIQUE INDEX "TransportGpsDevice_institutionId_deviceId_key" ON "TransportGpsDevice"("institutionId", "deviceId");
CREATE INDEX "TransportGpsDevice_institutionId_status_idx" ON "TransportGpsDevice"("institutionId", "status");
CREATE INDEX "TransportMasterAuditLog_institutionId_createdAt_idx" ON "TransportMasterAuditLog"("institutionId", "createdAt");
CREATE INDEX "TransportMasterAuditLog_entityType_entityId_idx" ON "TransportMasterAuditLog"("entityType", "entityId");
CREATE UNIQUE INDEX "TransportMasterSettings_institutionId_key" ON "TransportMasterSettings"("institutionId");

ALTER TABLE "TransportRouteStop" ADD CONSTRAINT "TransportRouteStop_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportRouteStop" ADD CONSTRAINT "TransportRouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportGpsDevice" ADD CONSTRAINT "TransportGpsDevice_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportMasterAuditLog" ADD CONSTRAINT "TransportMasterAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportMasterSettings" ADD CONSTRAINT "TransportMasterSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportVehicle" ADD CONSTRAINT "TransportVehicle_gpsDeviceId_fkey" FOREIGN KEY ("gpsDeviceId") REFERENCES "TransportGpsDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
