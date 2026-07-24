-- HR Salary Structure templates
CREATE TABLE IF NOT EXISTS "HrSalaryStructureTemplate" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "structureCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "payGrade" TEXT NOT NULL DEFAULT '',
    "payFrequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "earnings" JSONB NOT NULL DEFAULT '[]',
    "deductions" JSONB NOT NULL DEFAULT '[]',
    "employerContributions" JSONB NOT NULL DEFAULT '[]',
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "employerContribution" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrSalaryStructureTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrSalaryStructureAssignment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "annualCtc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlySalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payFrequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrSalaryStructureAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HrSalaryStructureTemplate_institutionId_structureCode_key" ON "HrSalaryStructureTemplate"("institutionId", "structureCode");
CREATE INDEX IF NOT EXISTS "HrSalaryStructureTemplate_institutionId_status_idx" ON "HrSalaryStructureTemplate"("institutionId", "status");
CREATE INDEX IF NOT EXISTS "HrSalaryStructureAssignment_institutionId_templateId_idx" ON "HrSalaryStructureAssignment"("institutionId", "templateId");
CREATE INDEX IF NOT EXISTS "HrSalaryStructureAssignment_employeeId_effectiveDate_idx" ON "HrSalaryStructureAssignment"("employeeId", "effectiveDate");

ALTER TABLE "HrSalaryStructureTemplate" ADD CONSTRAINT "HrSalaryStructureTemplate_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrSalaryStructureAssignment" ADD CONSTRAINT "HrSalaryStructureAssignment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrSalaryStructureAssignment" ADD CONSTRAINT "HrSalaryStructureAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "HrSalaryStructureTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrSalaryStructureAssignment" ADD CONSTRAINT "HrSalaryStructureAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
