-- Stops & Geo Fencing module

ALTER TABLE "TransportGeofence" ADD COLUMN IF NOT EXISTS "stopMasterId" TEXT;
ALTER TABLE "TransportGeofence" ADD COLUMN IF NOT EXISTS "geofenceShape" TEXT NOT NULL DEFAULT 'CIRCLE';
ALTER TABLE "TransportGeofence" ADD COLUMN IF NOT EXISTS "polygonPath" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "TransportGeofence" ADD COLUMN IF NOT EXISTS "branch" TEXT NOT NULL DEFAULT 'Main Campus';
ALTER TABLE "TransportGeofence" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportGeofence" ADD COLUMN IF NOT EXISTS "alertOnEnter" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TransportGeofence" ADD COLUMN IF NOT EXISTS "alertOnExit" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "TransportGeofence_stopMasterId_idx" ON "TransportGeofence"("stopMasterId");

CREATE TABLE IF NOT EXISTS "TransportStopMaster" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "stopCode" TEXT NOT NULL,
  "stopName" TEXT NOT NULL,
  "stopType" TEXT NOT NULL DEFAULT 'PICKUP',
  "latitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "longitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "landmark" TEXT NOT NULL DEFAULT '',
  "address" TEXT NOT NULL DEFAULT '',
  "city" TEXT NOT NULL DEFAULT '',
  "pincode" TEXT NOT NULL DEFAULT '',
  "branch" TEXT NOT NULL DEFAULT 'Main Campus',
  "academicYear" TEXT NOT NULL DEFAULT '2025-26',
  "routeId" TEXT,
  "sequenceOrder" INTEGER,
  "geoTagSource" TEXT NOT NULL DEFAULT 'MANUAL',
  "geoValidated" BOOLEAN NOT NULL DEFAULT false,
  "geofenceRadiusMeters" INTEGER NOT NULL DEFAULT 150,
  "studentCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "googlePlaceId" TEXT NOT NULL DEFAULT '',
  "googleMapsUrl" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "importBatchId" TEXT NOT NULL DEFAULT '',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TransportStopMaster_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TransportStopMaster_institutionId_stopCode_key" ON "TransportStopMaster"("institutionId", "stopCode");
CREATE INDEX IF NOT EXISTS "TransportStopMaster_institutionId_status_idx" ON "TransportStopMaster"("institutionId", "status");
CREATE INDEX IF NOT EXISTS "TransportStopMaster_institutionId_routeId_idx" ON "TransportStopMaster"("institutionId", "routeId");
CREATE INDEX IF NOT EXISTS "TransportStopMaster_institutionId_geoValidated_idx" ON "TransportStopMaster"("institutionId", "geoValidated");

CREATE TABLE IF NOT EXISTS "TransportStopImportLog" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "fileName" TEXT NOT NULL DEFAULT '',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "successCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "errors" JSONB NOT NULL DEFAULT '[]',
  "importedBy" TEXT NOT NULL DEFAULT 'Transport Manager',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TransportStopImportLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TransportStopImportLog_institutionId_createdAt_idx" ON "TransportStopImportLog"("institutionId", "createdAt");

CREATE TABLE IF NOT EXISTS "TransportStopsGeoSettings" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "defaultRadiusM" INTEGER NOT NULL DEFAULT 150,
  "mapCenterLat" DOUBLE PRECISION NOT NULL DEFAULT 26.9124,
  "mapCenterLng" DOUBLE PRECISION NOT NULL DEFAULT 75.7873,
  "mapZoom" INTEGER NOT NULL DEFAULT 13,
  "roleMatrix" JSONB NOT NULL DEFAULT '[]',
  "importRules" JSONB NOT NULL DEFAULT '{}',
  "mobileSyncRules" JSONB NOT NULL DEFAULT '{}',
  "reportCatalog" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TransportStopsGeoSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TransportStopsGeoSettings_institutionId_key" ON "TransportStopsGeoSettings"("institutionId");

CREATE TABLE IF NOT EXISTS "TransportStopsGeoAuditLog" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL DEFAULT '',
  "action" TEXT NOT NULL,
  "details" TEXT NOT NULL DEFAULT '',
  "performedBy" TEXT NOT NULL DEFAULT 'Transport Manager',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TransportStopsGeoAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TransportStopsGeoAuditLog_institutionId_createdAt_idx" ON "TransportStopsGeoAuditLog"("institutionId", "createdAt");

ALTER TABLE "TransportStopMaster" ADD CONSTRAINT "TransportStopMaster_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStopMaster" ADD CONSTRAINT "TransportStopMaster_routeId_fkey"
  FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportStopImportLog" ADD CONSTRAINT "TransportStopImportLog_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStopsGeoSettings" ADD CONSTRAINT "TransportStopsGeoSettings_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStopsGeoAuditLog" ADD CONSTRAINT "TransportStopsGeoAuditLog_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$ BEGIN
  ALTER TABLE "TransportGeofence" ADD CONSTRAINT "TransportGeofence_stopMasterId_fkey"
    FOREIGN KEY ("stopMasterId") REFERENCES "TransportStopMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
