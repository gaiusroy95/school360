-- CreateTable
CREATE TABLE "RaAnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "snapshotKey" TEXT NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'month',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "data" JSONB NOT NULL DEFAULT '{}',
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaAnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaReportRun" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reportKey" TEXT NOT NULL,
    "reportName" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL DEFAULT '',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "exportFormat" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT 'Reports Manager',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaReportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaCustomReport" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "modules" JSONB NOT NULL DEFAULT '[]',
    "columns" JSONB NOT NULL DEFAULT '[]',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL DEFAULT 'Admin',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaCustomReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaActivityLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT 'Reports Manager',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RaAnalyticsSnapshot_institutionId_academicYear_idx" ON "RaAnalyticsSnapshot"("institutionId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "RaAnalyticsSnapshot_institutionId_snapshotKey_period_academicYear_key" ON "RaAnalyticsSnapshot"("institutionId", "snapshotKey", "period", "academicYear");

-- CreateIndex
CREATE INDEX "RaReportRun_institutionId_category_createdAt_idx" ON "RaReportRun"("institutionId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "RaReportRun_institutionId_reportKey_idx" ON "RaReportRun"("institutionId", "reportKey");

-- CreateIndex
CREATE INDEX "RaCustomReport_institutionId_status_idx" ON "RaCustomReport"("institutionId", "status");

-- CreateIndex
CREATE INDEX "RaActivityLog_institutionId_createdAt_idx" ON "RaActivityLog"("institutionId", "createdAt");

-- AddForeignKey
ALTER TABLE "RaAnalyticsSnapshot" ADD CONSTRAINT "RaAnalyticsSnapshot_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaReportRun" ADD CONSTRAINT "RaReportRun_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaCustomReport" ADD CONSTRAINT "RaCustomReport_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaActivityLog" ADD CONSTRAINT "RaActivityLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
