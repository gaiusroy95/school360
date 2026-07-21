-- CreateEnum
CREATE TYPE "AdmissionRecordStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED');

-- CreateTable
CREATE TABLE "AdmissionRecord" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "admissionNumber" TEXT,
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "status" "AdmissionRecordStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "principalApprovedBy" TEXT NOT NULL DEFAULT '',
    "principalApprovedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionRecord_applicationId_key" ON "AdmissionRecord"("applicationId");
CREATE UNIQUE INDEX "AdmissionRecord_institutionId_admissionNumber_key" ON "AdmissionRecord"("institutionId", "admissionNumber");
CREATE INDEX "AdmissionRecord_institutionId_academicYear_status_idx" ON "AdmissionRecord"("institutionId", "academicYear", "status");
CREATE INDEX "AdmissionRecord_institutionId_className_sectionName_idx" ON "AdmissionRecord"("institutionId", "className", "sectionName");

-- AddForeignKey
ALTER TABLE "AdmissionRecord" ADD CONSTRAINT "AdmissionRecord_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdmissionRecord" ADD CONSTRAINT "AdmissionRecord_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
