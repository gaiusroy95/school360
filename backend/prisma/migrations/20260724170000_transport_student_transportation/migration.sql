-- Student Transportation module

CREATE TABLE "TransportStudentEnrollment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentId" TEXT,
    "applicationNumber" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL DEFAULT '',
    "sectionName" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "branch" TEXT NOT NULL DEFAULT 'Main Campus',
    "category" TEXT NOT NULL DEFAULT 'Day Scholar',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "workflowStage" TEXT NOT NULL DEFAULT 'APPLICATION',
    "pickupAddress" TEXT NOT NULL DEFAULT '',
    "dropAddress" TEXT NOT NULL DEFAULT '',
    "pickupLatitude" DOUBLE PRECISION,
    "pickupLongitude" DOUBLE PRECISION,
    "dropLatitude" DOUBLE PRECISION,
    "dropLongitude" DOUBLE PRECISION,
    "pickupStopName" TEXT NOT NULL DEFAULT '',
    "dropStopName" TEXT NOT NULL DEFAULT '',
    "routeId" TEXT,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "attendantId" TEXT,
    "seatNumber" INTEGER,
    "reservedSeat" BOOLEAN NOT NULL DEFAULT false,
    "effectiveDate" DATE,
    "endDate" DATE,
    "pickupTime" TEXT NOT NULL DEFAULT '07:15',
    "dropTime" TEXT NOT NULL DEFAULT '15:45',
    "feeStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "feeDueAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specialAssistance" BOOLEAN NOT NULL DEFAULT false,
    "medicalAlerts" JSONB NOT NULL DEFAULT '[]',
    "transportCardId" TEXT NOT NULL DEFAULT '',
    "qrCode" TEXT NOT NULL DEFAULT '',
    "rfidTag" TEXT NOT NULL DEFAULT '',
    "geoValidated" BOOLEAN NOT NULL DEFAULT false,
    "siblingGroupId" TEXT NOT NULL DEFAULT '',
    "photoUrl" TEXT NOT NULL DEFAULT '',
    "documents" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportStudentEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportStudentGuardian" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'Parent',
    "mobile" TEXT NOT NULL DEFAULT '',
    "otpEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isAuthorized" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportStudentGuardian_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportStudentRequest" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL DEFAULT '',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportStudentRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportStudentBoardingLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "boardingStatus" TEXT NOT NULL DEFAULT 'NOT_BOARDED',
    "dropStatus" TEXT NOT NULL DEFAULT '',
    "boardingMethod" TEXT NOT NULL DEFAULT '',
    "boardedAt" TIMESTAMP(3),
    "droppedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportStudentBoardingLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportStudentSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "suspendOnFeeDue" BOOLEAN NOT NULL DEFAULT true,
    "autoPromoteSession" BOOLEAN NOT NULL DEFAULT true,
    "roleMatrix" JSONB NOT NULL DEFAULT '[]',
    "notificationRules" JSONB NOT NULL DEFAULT '{}',
    "mobileSyncRules" JSONB NOT NULL DEFAULT '{}',
    "reportCatalog" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportStudentSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportStudentAuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT 'Transport Office',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportStudentAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TransportStudentEnrollment_institutionId_applicationNumber_key" ON "TransportStudentEnrollment"("institutionId", "applicationNumber");
CREATE INDEX "TransportStudentEnrollment_institutionId_status_academicYear_idx" ON "TransportStudentEnrollment"("institutionId", "status", "academicYear");
CREATE INDEX "TransportStudentEnrollment_institutionId_className_sectionName_idx" ON "TransportStudentEnrollment"("institutionId", "className", "sectionName");
CREATE INDEX "TransportStudentEnrollment_institutionId_routeId_idx" ON "TransportStudentEnrollment"("institutionId", "routeId");

CREATE INDEX "TransportStudentGuardian_enrollmentId_idx" ON "TransportStudentGuardian"("enrollmentId");
CREATE INDEX "TransportStudentGuardian_institutionId_idx" ON "TransportStudentGuardian"("institutionId");

CREATE INDEX "TransportStudentRequest_enrollmentId_requestType_idx" ON "TransportStudentRequest"("enrollmentId", "requestType");
CREATE INDEX "TransportStudentRequest_institutionId_status_idx" ON "TransportStudentRequest"("institutionId", "status");

CREATE UNIQUE INDEX "TransportStudentBoardingLog_enrollmentId_logDate_key" ON "TransportStudentBoardingLog"("enrollmentId", "logDate");
CREATE INDEX "TransportStudentBoardingLog_institutionId_logDate_idx" ON "TransportStudentBoardingLog"("institutionId", "logDate");

CREATE UNIQUE INDEX "TransportStudentSettings_institutionId_key" ON "TransportStudentSettings"("institutionId");

CREATE INDEX "TransportStudentAuditLog_institutionId_createdAt_idx" ON "TransportStudentAuditLog"("institutionId", "createdAt");

ALTER TABLE "TransportStudentEnrollment" ADD CONSTRAINT "TransportStudentEnrollment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStudentEnrollment" ADD CONSTRAINT "TransportStudentEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportStudentEnrollment" ADD CONSTRAINT "TransportStudentEnrollment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportStudentEnrollment" ADD CONSTRAINT "TransportStudentEnrollment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportStudentEnrollment" ADD CONSTRAINT "TransportStudentEnrollment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "TransportStaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportStudentEnrollment" ADD CONSTRAINT "TransportStudentEnrollment_attendantId_fkey" FOREIGN KEY ("attendantId") REFERENCES "TransportStaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransportStudentGuardian" ADD CONSTRAINT "TransportStudentGuardian_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStudentGuardian" ADD CONSTRAINT "TransportStudentGuardian_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TransportStudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportStudentRequest" ADD CONSTRAINT "TransportStudentRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStudentRequest" ADD CONSTRAINT "TransportStudentRequest_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TransportStudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportStudentBoardingLog" ADD CONSTRAINT "TransportStudentBoardingLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStudentBoardingLog" ADD CONSTRAINT "TransportStudentBoardingLog_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TransportStudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportStudentSettings" ADD CONSTRAINT "TransportStudentSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportStudentAuditLog" ADD CONSTRAINT "TransportStudentAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
