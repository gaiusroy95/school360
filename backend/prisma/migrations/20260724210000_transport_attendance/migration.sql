-- Transport Attendance & Student Boarding Management module

CREATE TABLE IF NOT EXISTS "TransportAttendanceSession" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "sessionNumber" TEXT NOT NULL,
  "sessionDate" DATE NOT NULL,
  "sessionType" TEXT NOT NULL DEFAULT 'MORNING_PICKUP',
  "tripId" TEXT,
  "vehicleId" TEXT,
  "routeId" TEXT,
  "driverId" TEXT,
  "attendantId" TEXT,
  "branch" TEXT NOT NULL DEFAULT 'Main Campus',
  "academicYear" TEXT NOT NULL DEFAULT '2025-26',
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "totalStudents" INTEGER NOT NULL DEFAULT 0,
  "boardedCount" INTEGER NOT NULL DEFAULT 0,
  "droppedCount" INTEGER NOT NULL DEFAULT 0,
  "absentCount" INTEGER NOT NULL DEFAULT 0,
  "pendingCount" INTEGER NOT NULL DEFAULT 0,
  "exceptionCount" INTEGER NOT NULL DEFAULT 0,
  "missedPickupCount" INTEGER NOT NULL DEFAULT 0,
  "missedDropCount" INTEGER NOT NULL DEFAULT 0,
  "currentOccupancy" INTEGER NOT NULL DEFAULT 0,
  "vehicleEmptyConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "attendanceLocked" BOOLEAN NOT NULL DEFAULT false,
  "boardingCutoffTime" TEXT NOT NULL DEFAULT '07:45',
  "reconciledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportAttendanceSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TransportAttendanceSession_institutionId_sessionNumber_key"
  ON "TransportAttendanceSession"("institutionId", "sessionNumber");
CREATE INDEX IF NOT EXISTS "TransportAttendanceSession_institutionId_sessionDate_status_idx"
  ON "TransportAttendanceSession"("institutionId", "sessionDate", "status");
CREATE INDEX IF NOT EXISTS "TransportAttendanceSession_vehicleId_sessionDate_idx"
  ON "TransportAttendanceSession"("vehicleId", "sessionDate");

CREATE TABLE IF NOT EXISTS "TransportAttendanceRecord" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "studentName" TEXT NOT NULL,
  "className" TEXT NOT NULL DEFAULT '',
  "sectionName" TEXT NOT NULL DEFAULT '',
  "assignedRouteId" TEXT,
  "assignedVehicleId" TEXT,
  "pickupStopName" TEXT NOT NULL DEFAULT '',
  "dropStopName" TEXT NOT NULL DEFAULT '',
  "seatNumber" INTEGER,
  "safetyStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "boardingStatus" TEXT NOT NULL DEFAULT 'NOT_BOARDED',
  "dropStatus" TEXT NOT NULL DEFAULT 'NOT_DROPPED',
  "boardingMethod" TEXT NOT NULL DEFAULT '',
  "dropMethod" TEXT NOT NULL DEFAULT '',
  "boardedAt" TIMESTAMP(3),
  "droppedAt" TIMESTAMP(3),
  "boardingLat" DOUBLE PRECISION,
  "boardingLng" DOUBLE PRECISION,
  "dropLat" DOUBLE PRECISION,
  "dropLng" DOUBLE PRECISION,
  "boardingStopName" TEXT NOT NULL DEFAULT '',
  "dropStopNameActual" TEXT NOT NULL DEFAULT '',
  "wrongBusAlert" BOOLEAN NOT NULL DEFAULT false,
  "wrongStopAlert" BOOLEAN NOT NULL DEFAULT false,
  "duplicatePrevented" BOOLEAN NOT NULL DEFAULT false,
  "guardianVerified" BOOLEAN NOT NULL DEFAULT false,
  "otpVerified" BOOLEAN NOT NULL DEFAULT false,
  "medicalAlert" TEXT NOT NULL DEFAULT '',
  "exceptionType" TEXT NOT NULL DEFAULT '',
  "exceptionReason" TEXT NOT NULL DEFAULT '',
  "isAbsent" BOOLEAN NOT NULL DEFAULT false,
  "absentReason" TEXT NOT NULL DEFAULT '',
  "offlineSynced" BOOLEAN NOT NULL DEFAULT true,
  "correctionStatus" TEXT NOT NULL DEFAULT 'NONE',
  "photoUrl" TEXT NOT NULL DEFAULT '',
  "siblingGroupId" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportAttendanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TransportAttendanceRecord_sessionId_enrollmentId_key"
  ON "TransportAttendanceRecord"("sessionId", "enrollmentId");
CREATE INDEX IF NOT EXISTS "TransportAttendanceRecord_institutionId_safetyStatus_idx"
  ON "TransportAttendanceRecord"("institutionId", "safetyStatus");
CREATE INDEX IF NOT EXISTS "TransportAttendanceRecord_institutionId_boardingStatus_idx"
  ON "TransportAttendanceRecord"("institutionId", "boardingStatus");

CREATE TABLE IF NOT EXISTS "TransportAttendanceEvent" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "recordId" TEXT,
  "enrollmentId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'QR',
  "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "vehicleId" TEXT,
  "routeId" TEXT,
  "stopName" TEXT NOT NULL DEFAULT '',
  "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
  "isWrongBus" BOOLEAN NOT NULL DEFAULT false,
  "isWrongStop" BOOLEAN NOT NULL DEFAULT false,
  "verifiedBy" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TransportAttendanceEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TransportAttendanceEvent_sessionId_scannedAt_idx"
  ON "TransportAttendanceEvent"("sessionId", "scannedAt");
CREATE INDEX IF NOT EXISTS "TransportAttendanceEvent_institutionId_eventType_idx"
  ON "TransportAttendanceEvent"("institutionId", "eventType");
CREATE INDEX IF NOT EXISTS "TransportAttendanceEvent_enrollmentId_scannedAt_idx"
  ON "TransportAttendanceEvent"("enrollmentId", "scannedAt");

CREATE TABLE IF NOT EXISTS "TransportAttendanceCorrection" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "correctionType" TEXT NOT NULL,
  "fieldName" TEXT NOT NULL DEFAULT '',
  "previousValue" TEXT NOT NULL DEFAULT '',
  "newValue" TEXT NOT NULL DEFAULT '',
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedBy" TEXT NOT NULL DEFAULT 'Driver',
  "approvedBy" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "TransportAttendanceCorrection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TransportAttendanceCorrection_institutionId_status_idx"
  ON "TransportAttendanceCorrection"("institutionId", "status");
CREATE INDEX IF NOT EXISTS "TransportAttendanceCorrection_recordId_idx"
  ON "TransportAttendanceCorrection"("recordId");

CREATE TABLE IF NOT EXISTS "TransportAttendanceSettings" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "boardingCutoffMin" INTEGER NOT NULL DEFAULT 15,
  "duplicateScanWindowSec" INTEGER NOT NULL DEFAULT 30,
  "lateBoardingAlertMin" INTEGER NOT NULL DEFAULT 10,
  "roleMatrix" JSONB NOT NULL DEFAULT '[]',
  "notificationRules" JSONB NOT NULL DEFAULT '{}',
  "mobileSyncRules" JSONB NOT NULL DEFAULT '{}',
  "attendanceModes" JSONB NOT NULL DEFAULT '[]',
  "reportCatalog" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportAttendanceSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TransportAttendanceSettings_institutionId_key"
  ON "TransportAttendanceSettings"("institutionId");

CREATE TABLE IF NOT EXISTS "TransportAttendanceAuditLog" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL DEFAULT '',
  "action" TEXT NOT NULL,
  "details" TEXT NOT NULL DEFAULT '',
  "performedBy" TEXT NOT NULL DEFAULT 'Transport Manager',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TransportAttendanceAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TransportAttendanceAuditLog_institutionId_createdAt_idx"
  ON "TransportAttendanceAuditLog"("institutionId", "createdAt");

ALTER TABLE "TransportAttendanceSession" ADD CONSTRAINT "TransportAttendanceSession_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportAttendanceSession" ADD CONSTRAINT "TransportAttendanceSession_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "TransportTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportAttendanceSession" ADD CONSTRAINT "TransportAttendanceSession_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportAttendanceSession" ADD CONSTRAINT "TransportAttendanceSession_routeId_fkey"
  FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportAttendanceSession" ADD CONSTRAINT "TransportAttendanceSession_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "TransportStaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportAttendanceSession" ADD CONSTRAINT "TransportAttendanceSession_attendantId_fkey"
  FOREIGN KEY ("attendantId") REFERENCES "TransportStaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransportAttendanceRecord" ADD CONSTRAINT "TransportAttendanceRecord_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportAttendanceRecord" ADD CONSTRAINT "TransportAttendanceRecord_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "TransportAttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportAttendanceRecord" ADD CONSTRAINT "TransportAttendanceRecord_enrollmentId_fkey"
  FOREIGN KEY ("enrollmentId") REFERENCES "TransportStudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportAttendanceEvent" ADD CONSTRAINT "TransportAttendanceEvent_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportAttendanceEvent" ADD CONSTRAINT "TransportAttendanceEvent_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "TransportAttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportAttendanceEvent" ADD CONSTRAINT "TransportAttendanceEvent_recordId_fkey"
  FOREIGN KEY ("recordId") REFERENCES "TransportAttendanceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransportAttendanceCorrection" ADD CONSTRAINT "TransportAttendanceCorrection_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportAttendanceCorrection" ADD CONSTRAINT "TransportAttendanceCorrection_recordId_fkey"
  FOREIGN KEY ("recordId") REFERENCES "TransportAttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportAttendanceSettings" ADD CONSTRAINT "TransportAttendanceSettings_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportAttendanceAuditLog" ADD CONSTRAINT "TransportAttendanceAuditLog_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
