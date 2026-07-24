-- Shift Management System extension
ALTER TABLE "HrShift" ADD COLUMN IF NOT EXISTS "shiftType" TEXT NOT NULL DEFAULT 'REGULAR';
ALTER TABLE "HrShift" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HrShift" ADD COLUMN IF NOT EXISTS "breakStart" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HrShift" ADD COLUMN IF NOT EXISTS "breakEnd" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HrShift" ADD COLUMN IF NOT EXISTS "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 8;
ALTER TABLE "HrShift" ADD COLUMN IF NOT EXISTS "lateMarkRule" TEXT NOT NULL DEFAULT 'Mark late after grace period';
ALTER TABLE "HrShift" ADD COLUMN IF NOT EXISTS "earlyExitRule" TEXT NOT NULL DEFAULT 'Deduction if exit before shift end';
ALTER TABLE "HrShift" ADD COLUMN IF NOT EXISTS "overtimeEligible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "HrShift" ADD COLUMN IF NOT EXISTS "halfDayRule" TEXT NOT NULL DEFAULT 'Less than 4 hours = Half Day';
ALTER TABLE "HrShift" ADD COLUMN IF NOT EXISTS "attendanceRule" TEXT NOT NULL DEFAULT 'Standard biometric attendance';
ALTER TABLE "HrShift" ADD COLUMN IF NOT EXISTS "payrollRule" TEXT NOT NULL DEFAULT 'Standard payroll mapping';
ALTER TABLE "HrShift" ADD COLUMN IF NOT EXISTS "applicableDepartments" JSONB NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS "HrShift_institutionId_shiftType_idx" ON "HrShift"("institutionId", "shiftType");

CREATE TABLE IF NOT EXISTS "HrInstitutionWorkingHours" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "branch" TEXT NOT NULL DEFAULT 'Main Branch',
    "institutionType" TEXT NOT NULL DEFAULT 'School',
    "workingDays" JSONB NOT NULL DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]',
    "weeklyOff" JSONB NOT NULL DEFAULT '["Sunday"]',
    "workingHoursStart" TEXT NOT NULL DEFAULT '09:00',
    "workingHoursEnd" TEXT NOT NULL DEFAULT '17:00',
    "breakDuration" INTEGER NOT NULL DEFAULT 60,
    "prayerAssembly" TEXT NOT NULL DEFAULT '08:45 - 09:00',
    "lunchBreak" TEXT NOT NULL DEFAULT '13:00 - 13:45',
    "teaBreak" TEXT NOT NULL DEFAULT '16:00 - 16:15',
    "earlyClosing" TEXT NOT NULL DEFAULT '',
    "halfDayRules" TEXT NOT NULL DEFAULT 'Less than 4 hours worked = Half Day',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrInstitutionWorkingHours_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrDepartmentShiftMapping" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "branch" TEXT NOT NULL DEFAULT 'Main Branch',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrDepartmentShiftMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrEmployeeShiftAssignment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "employmentType" TEXT NOT NULL DEFAULT 'PERMANENT',
    "branch" TEXT NOT NULL DEFAULT 'Main Branch',
    "workingDays" JSONB NOT NULL DEFAULT '[]',
    "weeklyOff" JSONB NOT NULL DEFAULT '["Sunday"]',
    "attendanceRule" TEXT NOT NULL DEFAULT '',
    "payrollRule" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrEmployeeShiftAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrShiftChangeRequest" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "currentShiftCode" TEXT NOT NULL DEFAULT '',
    "requestedShiftId" TEXT NOT NULL DEFAULT '',
    "reasonCategory" TEXT NOT NULL DEFAULT 'Personal',
    "reason" TEXT NOT NULL DEFAULT '',
    "effectiveDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "workflowLevel" TEXT NOT NULL DEFAULT 'MANAGER',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "reviewerRemarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrShiftChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrShiftSubstitute" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "absentEmployeeId" TEXT NOT NULL,
    "substituteEmployeeId" TEXT NOT NULL,
    "dutyDate" DATE NOT NULL,
    "shiftCode" TEXT NOT NULL DEFAULT '',
    "classInfo" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrShiftSubstitute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrShiftOvertimeRecord" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "otDate" DATE NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otType" TEXT NOT NULL DEFAULT 'EXTRA_HOURS',
    "reason" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrShiftOvertimeRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrShiftDutyAssignment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "dutyType" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftCode" TEXT NOT NULL DEFAULT '',
    "dutyDate" DATE NOT NULL,
    "reportingTime" TEXT NOT NULL DEFAULT '',
    "completionTime" TEXT NOT NULL DEFAULT '',
    "compensation" TEXT NOT NULL DEFAULT 'OT',
    "location" TEXT NOT NULL DEFAULT '',
    "gpsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "details" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrShiftDutyAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrWeeklyShiftPlanner" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "shiftId" TEXT,
    "department" TEXT NOT NULL DEFAULT '',
    "entryType" TEXT NOT NULL DEFAULT 'WORKING',
    "colorCode" TEXT NOT NULL DEFAULT 'green',
    "label" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrWeeklyShiftPlanner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrShiftModuleSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "rotationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "flexibleShiftEnabled" BOOLEAN NOT NULL DEFAULT true,
    "gpsAttendanceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "timetableSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxWeeklyHours" INTEGER NOT NULL DEFAULT 48,
    "minRestBetweenShifts" INTEGER NOT NULL DEFAULT 8,
    "overtimeLimitHours" INTEGER NOT NULL DEFAULT 20,
    "notificationChannels" JSONB NOT NULL DEFAULT '["Push","Email","SMS"]',
    "attendanceRules" JSONB NOT NULL DEFAULT '{}',
    "flexiblePolicies" JSONB NOT NULL DEFAULT '{}',
    "rotationTemplates" JSONB NOT NULL DEFAULT '[]',
    "dutyMasters" JSONB NOT NULL DEFAULT '{}',
    "allowanceMasters" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrShiftModuleSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HrInstitutionWorkingHours_institutionId_key" ON "HrInstitutionWorkingHours"("institutionId");
CREATE INDEX IF NOT EXISTS "HrDepartmentShiftMapping_institutionId_department_idx" ON "HrDepartmentShiftMapping"("institutionId", "department");
CREATE INDEX IF NOT EXISTS "HrEmployeeShiftAssignment_institutionId_employeeId_idx" ON "HrEmployeeShiftAssignment"("institutionId", "employeeId");
CREATE INDEX IF NOT EXISTS "HrShiftChangeRequest_institutionId_status_idx" ON "HrShiftChangeRequest"("institutionId", "status");
CREATE INDEX IF NOT EXISTS "HrShiftSubstitute_institutionId_dutyDate_idx" ON "HrShiftSubstitute"("institutionId", "dutyDate");
CREATE INDEX IF NOT EXISTS "HrShiftOvertimeRecord_institutionId_otDate_idx" ON "HrShiftOvertimeRecord"("institutionId", "otDate");
CREATE INDEX IF NOT EXISTS "HrShiftDutyAssignment_institutionId_dutyType_dutyDate_idx" ON "HrShiftDutyAssignment"("institutionId", "dutyType", "dutyDate");
CREATE INDEX IF NOT EXISTS "HrWeeklyShiftPlanner_institutionId_weekStart_idx" ON "HrWeeklyShiftPlanner"("institutionId", "weekStart");
CREATE UNIQUE INDEX IF NOT EXISTS "HrShiftModuleSettings_institutionId_key" ON "HrShiftModuleSettings"("institutionId");

ALTER TABLE "HrInstitutionWorkingHours" ADD CONSTRAINT "HrInstitutionWorkingHours_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrDepartmentShiftMapping" ADD CONSTRAINT "HrDepartmentShiftMapping_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrDepartmentShiftMapping" ADD CONSTRAINT "HrDepartmentShiftMapping_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "HrShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEmployeeShiftAssignment" ADD CONSTRAINT "HrEmployeeShiftAssignment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEmployeeShiftAssignment" ADD CONSTRAINT "HrEmployeeShiftAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEmployeeShiftAssignment" ADD CONSTRAINT "HrEmployeeShiftAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "HrShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrShiftChangeRequest" ADD CONSTRAINT "HrShiftChangeRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrShiftChangeRequest" ADD CONSTRAINT "HrShiftChangeRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrShiftSubstitute" ADD CONSTRAINT "HrShiftSubstitute_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrShiftSubstitute" ADD CONSTRAINT "HrShiftSubstitute_absentEmployeeId_fkey" FOREIGN KEY ("absentEmployeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrShiftSubstitute" ADD CONSTRAINT "HrShiftSubstitute_substituteEmployeeId_fkey" FOREIGN KEY ("substituteEmployeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrShiftOvertimeRecord" ADD CONSTRAINT "HrShiftOvertimeRecord_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrShiftOvertimeRecord" ADD CONSTRAINT "HrShiftOvertimeRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrShiftDutyAssignment" ADD CONSTRAINT "HrShiftDutyAssignment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrShiftDutyAssignment" ADD CONSTRAINT "HrShiftDutyAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrWeeklyShiftPlanner" ADD CONSTRAINT "HrWeeklyShiftPlanner_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrWeeklyShiftPlanner" ADD CONSTRAINT "HrWeeklyShiftPlanner_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "HrShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HrShiftModuleSettings" ADD CONSTRAINT "HrShiftModuleSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
