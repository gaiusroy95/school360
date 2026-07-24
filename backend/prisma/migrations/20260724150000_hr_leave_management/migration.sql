-- HR Leave Management module
CREATE TABLE IF NOT EXISTS "HrLeavePolicy" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "policyCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaveCategory" TEXT NOT NULL DEFAULT 'General',
    "description" TEXT NOT NULL DEFAULT '',
    "academicSession" TEXT NOT NULL DEFAULT '2025-26',
    "campus" TEXT NOT NULL DEFAULT 'Main Campus',
    "branch" TEXT NOT NULL DEFAULT 'Main Branch',
    "employeeTypes" JSONB NOT NULL DEFAULT '[]',
    "departments" JSONB NOT NULL DEFAULT '[]',
    "designations" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "leaveTypes" JSONB NOT NULL DEFAULT '[]',
    "generalRules" JSONB NOT NULL DEFAULT '{}',
    "approvalWorkflow" JSONB NOT NULL DEFAULT '[]',
    "documents" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrLeavePolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrLeaveApplication" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "leaveType" TEXT NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "totalDays" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "session" TEXT NOT NULL DEFAULT 'FULL',
    "reason" TEXT NOT NULL DEFAULT '',
    "addressDuringLeave" TEXT NOT NULL DEFAULT '',
    "emergencyContact" TEXT NOT NULL DEFAULT '',
    "attachmentUrl" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "workflowLevel" TEXT NOT NULL DEFAULT 'MANAGER',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "reviewerRemarks" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "appliedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrLeaveApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrLeaveBalance" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "leaveType" TEXT NOT NULL,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "annualAllocation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "availed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pending" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "available" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carryForward" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "encashable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrLeaveBalance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrLeaveSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "sandwichRule" BOOLEAN NOT NULL DEFAULT true,
    "includeHolidays" BOOLEAN NOT NULL DEFAULT false,
    "halfDayCalculation" TEXT NOT NULL DEFAULT '0.5 day per half',
    "minimumNoticeDays" INTEGER NOT NULL DEFAULT 1,
    "maxConsecutiveLeave" INTEGER NOT NULL DEFAULT 30,
    "autoApprovals" BOOLEAN NOT NULL DEFAULT false,
    "leaveFreezePeriod" TEXT NOT NULL DEFAULT '',
    "leaveYearStart" TEXT NOT NULL DEFAULT 'April',
    "carryForwardEnabled" BOOLEAN NOT NULL DEFAULT true,
    "leaveExpiryMonths" INTEGER NOT NULL DEFAULT 12,
    "documentMandatory" BOOLEAN NOT NULL DEFAULT false,
    "approvalLevels" JSONB NOT NULL DEFAULT '["Reporting Manager","Department Head","HR Manager","Principal"]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrLeaveSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HrLeavePolicy_institutionId_policyCode_key" ON "HrLeavePolicy"("institutionId", "policyCode");
CREATE INDEX IF NOT EXISTS "HrLeavePolicy_institutionId_status_idx" ON "HrLeavePolicy"("institutionId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "HrLeaveApplication_institutionId_recordId_key" ON "HrLeaveApplication"("institutionId", "recordId");
CREATE INDEX IF NOT EXISTS "HrLeaveApplication_institutionId_academicYear_status_idx" ON "HrLeaveApplication"("institutionId", "academicYear", "status");
CREATE INDEX IF NOT EXISTS "HrLeaveApplication_employeeId_fromDate_toDate_idx" ON "HrLeaveApplication"("employeeId", "fromDate", "toDate");
CREATE UNIQUE INDEX IF NOT EXISTS "HrLeaveBalance_employeeId_academicYear_leaveType_key" ON "HrLeaveBalance"("employeeId", "academicYear", "leaveType");
CREATE INDEX IF NOT EXISTS "HrLeaveBalance_institutionId_academicYear_idx" ON "HrLeaveBalance"("institutionId", "academicYear");
CREATE UNIQUE INDEX IF NOT EXISTS "HrLeaveSettings_institutionId_key" ON "HrLeaveSettings"("institutionId");

ALTER TABLE "HrLeavePolicy" ADD CONSTRAINT "HrLeavePolicy_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrLeaveApplication" ADD CONSTRAINT "HrLeaveApplication_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrLeaveApplication" ADD CONSTRAINT "HrLeaveApplication_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrLeaveBalance" ADD CONSTRAINT "HrLeaveBalance_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrLeaveBalance" ADD CONSTRAINT "HrLeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrLeaveSettings" ADD CONSTRAINT "HrLeaveSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
