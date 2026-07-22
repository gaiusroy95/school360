-- CreateEnum
CREATE TYPE "StudentAnalyticsStatus" AS ENUM ('DRAFT', 'PENDING', 'OPEN', 'ACTIVE', 'COMPLETED', 'APPROVED', 'PAID', 'DUE');

-- CreateTable
CREATE TABLE "StudentAnalyticsRecord" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "className" TEXT NOT NULL DEFAULT '',
    "sectionName" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "status" "StudentAnalyticsStatus" NOT NULL DEFAULT 'ACTIVE',
    "scores" JSONB NOT NULL DEFAULT '{}',
    "riskFlags" JSONB NOT NULL DEFAULT '{}',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAnalyticsRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentAnalyticsRecord_institutionId_recordId_key" ON "StudentAnalyticsRecord"("institutionId", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAnalyticsRecord_studentId_academicYear_key" ON "StudentAnalyticsRecord"("studentId", "academicYear");

-- CreateIndex
CREATE INDEX "StudentAnalyticsRecord_institutionId_status_idx" ON "StudentAnalyticsRecord"("institutionId", "status");

-- CreateIndex
CREATE INDEX "StudentAnalyticsRecord_institutionId_computedAt_idx" ON "StudentAnalyticsRecord"("institutionId", "computedAt");

-- CreateIndex
CREATE INDEX "StudentAnalyticsRecord_institutionId_className_sectionName_idx" ON "StudentAnalyticsRecord"("institutionId", "className", "sectionName");

-- AddForeignKey
ALTER TABLE "StudentAnalyticsRecord" ADD CONSTRAINT "StudentAnalyticsRecord_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAnalyticsRecord" ADD CONSTRAINT "StudentAnalyticsRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
