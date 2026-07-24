-- HR Attendance & Leave module
CREATE TABLE IF NOT EXISTS "HrShift" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '09:00',
    "endTime" TEXT NOT NULL DEFAULT '17:00',
    "breakMinutes" INTEGER NOT NULL DEFAULT 60,
    "graceMinutes" INTEGER NOT NULL DEFAULT 15,
    "weeklyOff" JSONB NOT NULL DEFAULT '["Sunday"]',
    "isNightShift" BOOLEAN NOT NULL DEFAULT false,
    "isFlexible" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrShift_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrAttendanceSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "officeStartTime" TEXT NOT NULL DEFAULT '09:00 AM',
    "officeEndTime" TEXT NOT NULL DEFAULT '05:00 PM',
    "graceMinutes" INTEGER NOT NULL DEFAULT 15,
    "monthlyAllowedLate" INTEGER NOT NULL DEFAULT 3,
    "halfDayRule" TEXT NOT NULL DEFAULT 'Less than 4 hours worked = Half Day',
    "lateRule" TEXT NOT NULL DEFAULT 'Deduction after grace period exceeded',
    "earlyExitRule" TEXT NOT NULL DEFAULT 'Deduction if exit before 30 mins of shift end',
    "missingPunchRule" TEXT NOT NULL DEFAULT 'Alert if no punch within 2 hours of shift end',
    "nightShiftRule" TEXT NOT NULL DEFAULT '10% allowance on basic for night shifts',
    "overtimeRule" TEXT NOT NULL DEFAULT '1.5x hourly rate for approved OT',
    "holidayRule" TEXT NOT NULL DEFAULT 'Auto-mark from institution holiday master',
    "weeklyOffRule" TEXT NOT NULL DEFAULT 'Saturday & Sunday',
    "payrollCutoffDate" INTEGER NOT NULL DEFAULT 25,
    "attendanceLockDate" INTEGER NOT NULL DEFAULT 28,
    "biometricSyncMinutes" INTEGER NOT NULL DEFAULT 15,
    "mapApprovedLeave" BOOLEAN NOT NULL DEFAULT true,
    "mapPublicHoliday" BOOLEAN NOT NULL DEFAULT true,
    "mapRestrictedHoliday" BOOLEAN NOT NULL DEFAULT true,
    "mapWeeklyOff" BOOLEAN NOT NULL DEFAULT true,
    "mapSchoolHoliday" BOOLEAN NOT NULL DEFAULT true,
    "mapVacation" BOOLEAN NOT NULL DEFAULT true,
    "autoLwpRules" JSONB NOT NULL DEFAULT '{}',
    "deductionRules" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrAttendanceSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrAttendanceDailyRecord" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "recordDate" DATE NOT NULL,
    "shiftCode" TEXT NOT NULL DEFAULT 'GEN',
    "inTime" TEXT NOT NULL DEFAULT '',
    "outTime" TEXT NOT NULL DEFAULT '',
    "workingHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyExitMinutes" INTEGER NOT NULL DEFAULT 0,
    "isMissingPunch" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT NOT NULL DEFAULT '',
    "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrAttendanceDailyRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrAttendanceCorrection" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "attendanceDate" DATE NOT NULL,
    "originalInTime" TEXT NOT NULL DEFAULT '',
    "originalOutTime" TEXT NOT NULL DEFAULT '',
    "correctedInTime" TEXT NOT NULL DEFAULT '',
    "correctedOutTime" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL,
    "attachmentUrl" TEXT NOT NULL DEFAULT '',
    "workflowStatus" TEXT NOT NULL DEFAULT 'PENDING_MANAGER',
    "managerRemarks" TEXT NOT NULL DEFAULT '',
    "hrRemarks" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrAttendanceCorrection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrAttendancePeriodLock" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "workflowStatus" TEXT NOT NULL DEFAULT 'OPEN',
    "workingDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrAttendancePeriodLock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HrShift_institutionId_code_key" ON "HrShift"("institutionId", "code");
CREATE INDEX IF NOT EXISTS "HrShift_institutionId_status_idx" ON "HrShift"("institutionId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "HrAttendanceSettings_institutionId_key" ON "HrAttendanceSettings"("institutionId");
CREATE UNIQUE INDEX IF NOT EXISTS "HrAttendanceDailyRecord_employeeId_recordDate_key" ON "HrAttendanceDailyRecord"("employeeId", "recordDate");
CREATE INDEX IF NOT EXISTS "HrAttendanceDailyRecord_institutionId_recordDate_idx" ON "HrAttendanceDailyRecord"("institutionId", "recordDate");
CREATE INDEX IF NOT EXISTS "HrAttendanceDailyRecord_institutionId_recordDate_status_idx" ON "HrAttendanceDailyRecord"("institutionId", "recordDate", "status");
CREATE INDEX IF NOT EXISTS "HrAttendanceDailyRecord_institutionId_approvalStatus_idx" ON "HrAttendanceDailyRecord"("institutionId", "approvalStatus");
CREATE INDEX IF NOT EXISTS "HrAttendanceCorrection_institutionId_workflowStatus_idx" ON "HrAttendanceCorrection"("institutionId", "workflowStatus");
CREATE INDEX IF NOT EXISTS "HrAttendanceCorrection_employeeId_attendanceDate_idx" ON "HrAttendanceCorrection"("employeeId", "attendanceDate");
CREATE UNIQUE INDEX IF NOT EXISTS "HrAttendancePeriodLock_institutionId_year_month_key" ON "HrAttendancePeriodLock"("institutionId", "year", "month");

ALTER TABLE "HrShift" ADD CONSTRAINT "HrShift_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrAttendanceSettings" ADD CONSTRAINT "HrAttendanceSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrAttendanceDailyRecord" ADD CONSTRAINT "HrAttendanceDailyRecord_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrAttendanceDailyRecord" ADD CONSTRAINT "HrAttendanceDailyRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrAttendanceCorrection" ADD CONSTRAINT "HrAttendanceCorrection_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrAttendanceCorrection" ADD CONSTRAINT "HrAttendanceCorrection_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrAttendancePeriodLock" ADD CONSTRAINT "HrAttendancePeriodLock_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
