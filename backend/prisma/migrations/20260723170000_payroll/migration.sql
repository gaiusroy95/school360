-- CreateEnum
CREATE TYPE "PayrollEmploymentType" AS ENUM ('TEACHING', 'NON_TEACHING', 'ADMIN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "PayrollSlipStatus" AS ENUM ('DRAFT', 'GENERATED', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "PayrollEmployee" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "employmentType" "PayrollEmploymentType" NOT NULL DEFAULT 'TEACHING',
    "department" TEXT NOT NULL DEFAULT 'General',
    "designation" TEXT NOT NULL DEFAULT 'Staff',
    "mobile" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "joinDate" TIMESTAMP(3),
    "bankAccount" TEXT NOT NULL DEFAULT '',
    "bankIfsc" TEXT NOT NULL DEFAULT '',
    "panNumber" TEXT NOT NULL DEFAULT '',
    "uanNumber" TEXT NOT NULL DEFAULT '',
    "pfNumber" TEXT NOT NULL DEFAULT '',
    "esicNumber" TEXT NOT NULL DEFAULT '',
    "epfApplicable" BOOLEAN NOT NULL DEFAULT true,
    "esicApplicable" BOOLEAN NOT NULL DEFAULT true,
    "status" "FeeMasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollSalaryStructure" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "structureCode" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "basicSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "da" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specialAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conveyanceAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherAllowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pfWages" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "epfEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "epfEmployer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esicEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esicEmployer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "professionalTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "FeeMasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollSalaryStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollStatutoryConfig" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "epfEmployeePercent" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "epfEmployerPercent" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "epfWageCeiling" DOUBLE PRECISION NOT NULL DEFAULT 15000,
    "esicEmployeePercent" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "esicEmployerPercent" DOUBLE PRECISION NOT NULL DEFAULT 3.25,
    "esicWageCeiling" DOUBLE PRECISION NOT NULL DEFAULT 21000,
    "professionalTaxAmount" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "remarks" TEXT NOT NULL DEFAULT '',
    "updatedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollStatutoryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollSlip" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "structureId" TEXT,
    "slipNumber" TEXT NOT NULL,
    "payPeriod" TEXT NOT NULL,
    "payMonth" INTEGER NOT NULL,
    "payYear" INTEGER NOT NULL,
    "workingDays" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "presentDays" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "leaveDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "basicSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "da" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specialAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conveyanceAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherAllowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "epfEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "epfEmployer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esicEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esicEmployer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "professionalTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "PayrollSlipStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAt" TIMESTAMP(3),
    "paidBy" TEXT NOT NULL DEFAULT '',
    "generatedBy" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollSlip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayrollEmployee_institutionId_employeeCode_key" ON "PayrollEmployee"("institutionId", "employeeCode");
CREATE INDEX "PayrollEmployee_institutionId_status_idx" ON "PayrollEmployee"("institutionId", "status");
CREATE INDEX "PayrollEmployee_institutionId_employmentType_idx" ON "PayrollEmployee"("institutionId", "employmentType");
CREATE INDEX "PayrollEmployee_institutionId_department_idx" ON "PayrollEmployee"("institutionId", "department");

CREATE UNIQUE INDEX "PayrollSalaryStructure_institutionId_structureCode_key" ON "PayrollSalaryStructure"("institutionId", "structureCode");
CREATE INDEX "PayrollSalaryStructure_institutionId_employeeId_status_idx" ON "PayrollSalaryStructure"("institutionId", "employeeId", "status");
CREATE INDEX "PayrollSalaryStructure_institutionId_effectiveFrom_idx" ON "PayrollSalaryStructure"("institutionId", "effectiveFrom");

CREATE UNIQUE INDEX "PayrollStatutoryConfig_institutionId_key" ON "PayrollStatutoryConfig"("institutionId");

CREATE UNIQUE INDEX "PayrollSlip_institutionId_slipNumber_key" ON "PayrollSlip"("institutionId", "slipNumber");
CREATE UNIQUE INDEX "PayrollSlip_institutionId_employeeId_payPeriod_key" ON "PayrollSlip"("institutionId", "employeeId", "payPeriod");
CREATE INDEX "PayrollSlip_institutionId_payPeriod_status_idx" ON "PayrollSlip"("institutionId", "payPeriod", "status");
CREATE INDEX "PayrollSlip_institutionId_payYear_payMonth_idx" ON "PayrollSlip"("institutionId", "payYear", "payMonth");
CREATE INDEX "PayrollSlip_employeeId_idx" ON "PayrollSlip"("employeeId");

-- AddForeignKey
ALTER TABLE "PayrollEmployee" ADD CONSTRAINT "PayrollEmployee_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollSalaryStructure" ADD CONSTRAINT "PayrollSalaryStructure_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollSalaryStructure" ADD CONSTRAINT "PayrollSalaryStructure_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollStatutoryConfig" ADD CONSTRAINT "PayrollStatutoryConfig_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollSlip" ADD CONSTRAINT "PayrollSlip_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollSlip" ADD CONSTRAINT "PayrollSlip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollSlip" ADD CONSTRAINT "PayrollSlip_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "PayrollSalaryStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
