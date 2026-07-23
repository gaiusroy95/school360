-- CreateEnum
CREATE TYPE "FeeOtherChargeRequestType" AS ENUM ('NEW_ADMISSION_DISCOUNT', 'ACCOUNT_SETTLEMENT');

-- CreateTable
CREATE TABLE "FeeOtherChargeType" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "defaultAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "frequency" TEXT NOT NULL DEFAULT 'As Applicable',
    "gstMode" TEXT NOT NULL DEFAULT 'CONFIGURABLE',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "FeeMasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeeOtherChargeType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeeOtherChargeRequest" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "requestType" "FeeOtherChargeRequestType" NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "code" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "settlementAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "chargeTypeId" TEXT,
    "chargeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL DEFAULT '',
    "admissionNumber" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL DEFAULT '',
    "sectionName" TEXT NOT NULL DEFAULT '',
    "status" "FeeApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "requestedBy" TEXT NOT NULL DEFAULT '',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeeOtherChargeRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeeOtherChargeType_institutionId_code_key" ON "FeeOtherChargeType"("institutionId", "code");
CREATE INDEX "FeeOtherChargeType_institutionId_status_idx" ON "FeeOtherChargeType"("institutionId", "status");

CREATE UNIQUE INDEX "FeeOtherChargeRequest_institutionId_recordId_key" ON "FeeOtherChargeRequest"("institutionId", "recordId");
CREATE INDEX "FeeOtherChargeRequest_institutionId_requestType_status_academicYear_idx" ON "FeeOtherChargeRequest"("institutionId", "requestType", "status", "academicYear");
CREATE INDEX "FeeOtherChargeRequest_institutionId_studentId_idx" ON "FeeOtherChargeRequest"("institutionId", "studentId");
CREATE INDEX "FeeOtherChargeRequest_chargeTypeId_idx" ON "FeeOtherChargeRequest"("chargeTypeId");

ALTER TABLE "FeeOtherChargeType" ADD CONSTRAINT "FeeOtherChargeType_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeeOtherChargeRequest" ADD CONSTRAINT "FeeOtherChargeRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeeOtherChargeRequest" ADD CONSTRAINT "FeeOtherChargeRequest_chargeTypeId_fkey" FOREIGN KEY ("chargeTypeId") REFERENCES "FeeOtherChargeType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
