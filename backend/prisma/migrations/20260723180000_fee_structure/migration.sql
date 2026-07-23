-- CreateEnum
CREATE TYPE "FeeStructureStatus" AS ENUM ('DRAFT', 'OPEN', 'ACTIVE', 'PENDING', 'DUE', 'COMPLETED');

-- CreateTable
CREATE TABLE "FeeStructure" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL DEFAULT 'A',
    "frequency" TEXT NOT NULL DEFAULT 'Yearly',
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL DEFAULT '',
    "admissionNumber" TEXT NOT NULL DEFAULT '',
    "tuitionFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "admissionFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "registrationFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "librarySecurityDeposit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cautionMoney" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "computerLabFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "picnicFieldTrip" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "addOnFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "examinationFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "annualCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sportsFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "FeeStructureStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveDate" DATE,
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeeStructure_institutionId_recordId_key" ON "FeeStructure"("institutionId", "recordId");
CREATE INDEX "FeeStructure_institutionId_academicYear_status_idx" ON "FeeStructure"("institutionId", "academicYear", "status");
CREATE INDEX "FeeStructure_institutionId_className_sectionName_idx" ON "FeeStructure"("institutionId", "className", "sectionName");
CREATE INDEX "FeeStructure_institutionId_studentId_idx" ON "FeeStructure"("institutionId", "studentId");

ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
