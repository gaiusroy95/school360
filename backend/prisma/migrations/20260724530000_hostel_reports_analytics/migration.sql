-- CreateTable
CREATE TABLE "HostelReportsSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "monthlyMessBudget" DOUBLE PRECISION NOT NULL DEFAULT 650000,
    "reportCatalog" JSONB NOT NULL DEFAULT '[]',
    "roleMatrix" JSONB NOT NULL DEFAULT '[]',
    "complianceBodies" JSONB NOT NULL DEFAULT '["UGC","CBSE","State Education Dept"]',
    "exportFormats" JSONB NOT NULL DEFAULT '["PDF","Excel","CSV"]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelReportsSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostelReportSchedule" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "reportTemplate" TEXT NOT NULL,
    "reportName" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "recipients" TEXT NOT NULL DEFAULT '',
    "cronExpr" TEXT NOT NULL DEFAULT '0 8 1 * *',
    "hostelId" TEXT NOT NULL DEFAULT '',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT 'Warden',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelReportSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostelReportRun" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "reportTemplate" TEXT NOT NULL,
    "reportName" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "exportFormat" TEXT NOT NULL DEFAULT '',
    "hostelId" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT 'Warden',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelReportRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HostelReportsSettings_institutionId_key" ON "HostelReportsSettings"("institutionId");

-- CreateIndex
CREATE INDEX "HostelReportSchedule_institutionId_status_idx" ON "HostelReportSchedule"("institutionId", "status");

-- CreateIndex
CREATE INDEX "HostelReportRun_institutionId_createdAt_idx" ON "HostelReportRun"("institutionId", "createdAt");

-- CreateIndex
CREATE INDEX "HostelReportRun_institutionId_reportTemplate_idx" ON "HostelReportRun"("institutionId", "reportTemplate");

-- AddForeignKey
ALTER TABLE "HostelReportsSettings" ADD CONSTRAINT "HostelReportsSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelReportSchedule" ADD CONSTRAINT "HostelReportSchedule_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelReportRun" ADD CONSTRAINT "HostelReportRun_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
