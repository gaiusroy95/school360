-- Live Vehicle Tracking module

CREATE TABLE "TransportLiveTrip" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "tripNumber" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "routeId" TEXT,
    "driverId" TEXT,
    "tripDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "gpsSource" TEXT NOT NULL DEFAULT 'DEVICE',
    "branch" TEXT NOT NULL DEFAULT 'Main Campus',
    "startedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "currentStopIndex" INTEGER NOT NULL DEFAULT 0,
    "completedStops" INTEGER NOT NULL DEFAULT 0,
    "totalStops" INTEGER NOT NULL DEFAULT 0,
    "distanceCoveredKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentSpeedKmh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgSpeedKmh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "heading" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION NOT NULL DEFAULT 26.9124,
    "longitude" DOUBLE PRECISION NOT NULL DEFAULT 75.7873,
    "etaNextStop" TEXT NOT NULL DEFAULT '',
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "fuelLevelPct" DOUBLE PRECISION,
    "engineOn" BOOLEAN NOT NULL DEFAULT false,
    "ignitionOn" BOOLEAN NOT NULL DEFAULT false,
    "gpsSignalHealth" TEXT NOT NULL DEFAULT 'ONLINE',
    "driverAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "studentsBoarded" INTEGER NOT NULL DEFAULT 0,
    "studentsTotal" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportLiveTrip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportLiveTripEvent" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "stopName" TEXT NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportLiveTripEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportGeofence" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fenceType" TEXT NOT NULL DEFAULT 'STOP',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportGeofence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportTrackingAlert" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "tripId" TEXT,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "message" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportTrackingAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportLiveTrackingSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "refreshIntervalSec" INTEGER NOT NULL DEFAULT 10,
    "speedLimitKmh" INTEGER NOT NULL DEFAULT 60,
    "idleThresholdMin" INTEGER NOT NULL DEFAULT 10,
    "longHaltMin" INTEGER NOT NULL DEFAULT 15,
    "roleMatrix" JSONB NOT NULL DEFAULT '[]',
    "notificationRules" JSONB NOT NULL DEFAULT '{}',
    "mobileSyncRules" JSONB NOT NULL DEFAULT '{}',
    "reportCatalog" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportLiveTrackingSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportTrackingAuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT 'System',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportTrackingAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TransportLiveTrip_institutionId_tripNumber_key" ON "TransportLiveTrip"("institutionId", "tripNumber");
CREATE INDEX "TransportLiveTrip_institutionId_tripDate_status_idx" ON "TransportLiveTrip"("institutionId", "tripDate", "status");
CREATE INDEX "TransportLiveTrip_vehicleId_tripDate_idx" ON "TransportLiveTrip"("vehicleId", "tripDate");

CREATE INDEX "TransportLiveTripEvent_tripId_createdAt_idx" ON "TransportLiveTripEvent"("tripId", "createdAt");
CREATE INDEX "TransportLiveTripEvent_institutionId_eventType_idx" ON "TransportLiveTripEvent"("institutionId", "eventType");

CREATE INDEX "TransportGeofence_institutionId_fenceType_idx" ON "TransportGeofence"("institutionId", "fenceType");

CREATE INDEX "TransportTrackingAlert_institutionId_acknowledged_createdAt_idx" ON "TransportTrackingAlert"("institutionId", "acknowledged", "createdAt");
CREATE INDEX "TransportTrackingAlert_vehicleId_createdAt_idx" ON "TransportTrackingAlert"("vehicleId", "createdAt");

CREATE UNIQUE INDEX "TransportLiveTrackingSettings_institutionId_key" ON "TransportLiveTrackingSettings"("institutionId");

CREATE INDEX "TransportTrackingAuditLog_institutionId_createdAt_idx" ON "TransportTrackingAuditLog"("institutionId", "createdAt");

ALTER TABLE "TransportLiveTrip" ADD CONSTRAINT "TransportLiveTrip_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportLiveTrip" ADD CONSTRAINT "TransportLiveTrip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportLiveTrip" ADD CONSTRAINT "TransportLiveTrip_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportLiveTrip" ADD CONSTRAINT "TransportLiveTrip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "TransportStaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransportLiveTripEvent" ADD CONSTRAINT "TransportLiveTripEvent_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportLiveTripEvent" ADD CONSTRAINT "TransportLiveTripEvent_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "TransportLiveTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportGeofence" ADD CONSTRAINT "TransportGeofence_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportTrackingAlert" ADD CONSTRAINT "TransportTrackingAlert_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportTrackingAlert" ADD CONSTRAINT "TransportTrackingAlert_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportTrackingAlert" ADD CONSTRAINT "TransportTrackingAlert_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "TransportLiveTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransportLiveTrackingSettings" ADD CONSTRAINT "TransportLiveTrackingSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportTrackingAuditLog" ADD CONSTRAINT "TransportTrackingAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
