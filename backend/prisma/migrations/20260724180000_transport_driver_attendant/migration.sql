-- Driver & Attendant Management module

ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "employeeCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "employmentType" TEXT NOT NULL DEFAULT 'Permanent';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "branch" TEXT NOT NULL DEFAULT 'Main Campus';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "aadhaarNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "panNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "bloodGroup" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "addressPermanent" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "addressCurrent" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "emergencyContact" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "emergencyMobile" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "licenseNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "licenseCategory" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "licenseExpiry" DATE;
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "badgeNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "medicalFitnessExpiry" DATE;
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "policeVerificationStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "backgroundVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "documents" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "shiftType" TEXT NOT NULL DEFAULT 'DOUBLE';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "assignedRouteId" TEXT;
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "assignedVehicleId" TEXT;
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "backupStaffId" TEXT;
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "yearsExperience" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "workflowStage" TEXT NOT NULL DEFAULT 'RECRUITMENT';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "staffStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "hrmsEmployeeId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "accidentCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "violationCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "uniformIssued" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TransportStaffMember" ADD COLUMN IF NOT EXISTS "mobileDeviceId" TEXT NOT NULL DEFAULT '';

UPDATE "TransportStaffMember" SET "employeeCode" = 'STF-' || LEFT("id", 8) WHERE "employeeCode" = '' OR "employeeCode" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "TransportStaffMember_institutionId_employeeCode_key" ON "TransportStaffMember"("institutionId", "employeeCode");
CREATE INDEX IF NOT EXISTS "TransportStaffMember_institutionId_staffStatus_idx" ON "TransportStaffMember"("institutionId", "staffStatus");

ALTER TABLE "TransportStaffMember" ADD CONSTRAINT "TransportStaffMember_assignedRouteId_fkey" FOREIGN KEY ("assignedRouteId") REFERENCES "TransportRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportStaffMember" ADD CONSTRAINT "TransportStaffMember_assignedVehicleId_fkey" FOREIGN KEY ("assignedVehicleId") REFERENCES "TransportVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TransportStaffDocument" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL DEFAULT '',
    "expiryDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'VALID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportStaffDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportStaffTraining" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "completedAt" DATE,
    "validTill" DATE,
    "certificateId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportStaffTraining_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportStaffDutyRoster" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "rosterDate" DATE NOT NULL,
    "shiftType" TEXT NOT NULL DEFAULT 'MORNING',
    "routeId" TEXT,
    "vehicleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportStaffDutyRoster_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportStaffAttendance" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "attendDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "method" TEXT NOT NULL DEFAULT 'BIOMETRIC',
    "checkIn" TEXT NOT NULL DEFAULT '',
    "checkOut" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportStaffAttendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportStaffLeaveRequest" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL DEFAULT 'CASUAL',
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportStaffLeaveRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportStaffComplaint" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "complaintType" TEXT NOT NULL DEFAULT 'COMPLAINT',
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportStaffComplaint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportStaffSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "maxDrivingHours" INTEGER NOT NULL DEFAULT 10,
    "licenseAlertDays" INTEGER NOT NULL DEFAULT 30,
    "roleMatrix" JSONB NOT NULL DEFAULT '[]',
    "notificationRules" JSONB NOT NULL DEFAULT '{}',
    "mobileSyncRules" JSONB NOT NULL DEFAULT '{}',
    "reportCatalog" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportStaffSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportStaffAuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT 'HR Admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransportStaffAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TransportStaffDocument_staffId_documentType_idx" ON "TransportStaffDocument"("staffId", "documentType");
CREATE INDEX "TransportStaffDocument_institutionId_expiryDate_idx" ON "TransportStaffDocument"("institutionId", "expiryDate");
CREATE INDEX "TransportStaffTraining_staffId_idx" ON "TransportStaffTraining"("staffId");
CREATE INDEX "TransportStaffDutyRoster_institutionId_rosterDate_idx" ON "TransportStaffDutyRoster"("institutionId", "rosterDate");
CREATE INDEX "TransportStaffDutyRoster_staffId_rosterDate_idx" ON "TransportStaffDutyRoster"("staffId", "rosterDate");
CREATE UNIQUE INDEX "TransportStaffAttendance_staffId_attendDate_key" ON "TransportStaffAttendance"("staffId", "attendDate");
CREATE INDEX "TransportStaffAttendance_institutionId_attendDate_idx" ON "TransportStaffAttendance"("institutionId", "attendDate");
CREATE INDEX "TransportStaffLeaveRequest_staffId_status_idx" ON "TransportStaffLeaveRequest"("staffId", "status");
CREATE INDEX "TransportStaffComplaint_staffId_status_idx" ON "TransportStaffComplaint"("staffId", "status");
CREATE UNIQUE INDEX "TransportStaffSettings_institutionId_key" ON "TransportStaffSettings"("institutionId");
CREATE INDEX "TransportStaffAuditLog_institutionId_createdAt_idx" ON "TransportStaffAuditLog"("institutionId", "createdAt");

ALTER TABLE "TransportStaffDocument" ADD CONSTRAINT "TransportStaffDocument_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStaffDocument" ADD CONSTRAINT "TransportStaffDocument_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "TransportStaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStaffTraining" ADD CONSTRAINT "TransportStaffTraining_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStaffTraining" ADD CONSTRAINT "TransportStaffTraining_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "TransportStaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStaffDutyRoster" ADD CONSTRAINT "TransportStaffDutyRoster_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStaffDutyRoster" ADD CONSTRAINT "TransportStaffDutyRoster_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "TransportStaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStaffAttendance" ADD CONSTRAINT "TransportStaffAttendance_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStaffAttendance" ADD CONSTRAINT "TransportStaffAttendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "TransportStaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStaffLeaveRequest" ADD CONSTRAINT "TransportStaffLeaveRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStaffLeaveRequest" ADD CONSTRAINT "TransportStaffLeaveRequest_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "TransportStaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStaffComplaint" ADD CONSTRAINT "TransportStaffComplaint_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStaffComplaint" ADD CONSTRAINT "TransportStaffComplaint_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "TransportStaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStaffSettings" ADD CONSTRAINT "TransportStaffSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStaffAuditLog" ADD CONSTRAINT "TransportStaffAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
