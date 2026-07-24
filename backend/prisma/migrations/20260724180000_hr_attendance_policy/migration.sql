-- Attendance Policy: policy assignments + extended settings
ALTER TABLE "HrLeavePolicy" ADD COLUMN IF NOT EXISTS "effectiveFrom" DATE;
ALTER TABLE "HrLeavePolicy" ADD COLUMN IF NOT EXISTS "applicableTo" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "HrLeaveSettings" ADD COLUMN IF NOT EXISTS "encashmentEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "HrLeaveSettings" ADD COLUMN IF NOT EXISTS "negativeBalanceAllowed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HrLeaveSettings" ADD COLUMN IF NOT EXISTS "managerApprovalRequired" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "HrLeaveSettings" ADD COLUMN IF NOT EXISTS "lopCalculation" TEXT NOT NULL DEFAULT 'Per day salary ÷ working days × LOP days';
ALTER TABLE "HrLeaveSettings" ADD COLUMN IF NOT EXISTS "workingDays" JSONB NOT NULL DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday"]';
ALTER TABLE "HrLeaveSettings" ADD COLUMN IF NOT EXISTS "weekendDays" JSONB NOT NULL DEFAULT '["Saturday","Sunday"]';
ALTER TABLE "HrLeaveSettings" ADD COLUMN IF NOT EXISTS "calendarName" TEXT NOT NULL DEFAULT 'Academic Calendar 2025-26';

CREATE TABLE IF NOT EXISTS "HrLeavePolicyAssignment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrLeavePolicyAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HrLeavePolicyAssignment_institutionId_policyId_idx" ON "HrLeavePolicyAssignment"("institutionId", "policyId");
CREATE INDEX IF NOT EXISTS "HrLeavePolicyAssignment_employeeId_effectiveDate_idx" ON "HrLeavePolicyAssignment"("employeeId", "effectiveDate");

ALTER TABLE "HrLeavePolicyAssignment" ADD CONSTRAINT "HrLeavePolicyAssignment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrLeavePolicyAssignment" ADD CONSTRAINT "HrLeavePolicyAssignment_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "HrLeavePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrLeavePolicyAssignment" ADD CONSTRAINT "HrLeavePolicyAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
