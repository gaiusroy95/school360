-- CreateEnum
CREATE TYPE "GatePassType" AS ENUM ('HALF_DAY', 'MID_CLASS');

-- CreateEnum
CREATE TYPE "GatePassStatus" AS ENUM ('PENDING', 'AWAITING_PRINCIPAL', 'APPROVED', 'REJECTED', 'ISSUED', 'COMPLETED');

-- CreateTable
CREATE TABLE "StudentGatePass" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "passNumber" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL DEFAULT '',
    "passType" "GatePassType" NOT NULL,
    "reason" TEXT NOT NULL,
    "remarks" TEXT NOT NULL DEFAULT '',
    "parentName" TEXT NOT NULL,
    "parentMobile" TEXT NOT NULL DEFAULT '',
    "parentRelation" TEXT NOT NULL DEFAULT 'Parent',
    "status" "GatePassStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "submittedBy" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3),
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT NOT NULL DEFAULT '',
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT NOT NULL DEFAULT '',
    "principalRemarks" TEXT NOT NULL DEFAULT '',
    "issuedBy" TEXT NOT NULL DEFAULT '',
    "issuedAt" TIMESTAMP(3),
    "exitTime" TEXT NOT NULL DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "principalNotifiedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'FRONT_DESK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentGatePass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentGatePass_institutionId_recordId_key" ON "StudentGatePass"("institutionId", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentGatePass_institutionId_passNumber_key" ON "StudentGatePass"("institutionId", "passNumber");

-- CreateIndex
CREATE INDEX "StudentGatePass_institutionId_academicYear_status_idx" ON "StudentGatePass"("institutionId", "academicYear", "status");

-- CreateIndex
CREATE INDEX "StudentGatePass_studentId_createdAt_idx" ON "StudentGatePass"("studentId", "createdAt");

-- AddForeignKey
ALTER TABLE "StudentGatePass" ADD CONSTRAINT "StudentGatePass_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGatePass" ADD CONSTRAINT "StudentGatePass_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
