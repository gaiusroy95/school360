-- CreateTable
CREATE TABLE "CommReportSchedule" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "reportTemplate" TEXT NOT NULL,
    "reportName" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "recipients" TEXT NOT NULL DEFAULT '',
    "cronExpr" TEXT NOT NULL DEFAULT '0 8 1 * *',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT 'Communication Manager',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommReportSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommReportRun" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "reportTemplate" TEXT NOT NULL,
    "reportName" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "exportFormat" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT 'Communication Manager',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommReportRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommReportSchedule_institutionId_status_idx" ON "CommReportSchedule"("institutionId", "status");

-- CreateIndex
CREATE INDEX "CommReportSchedule_institutionId_academicYear_idx" ON "CommReportSchedule"("institutionId", "academicYear");

-- CreateIndex
CREATE INDEX "CommReportRun_institutionId_createdAt_idx" ON "CommReportRun"("institutionId", "createdAt");

-- CreateIndex
CREATE INDEX "CommReportRun_institutionId_reportTemplate_idx" ON "CommReportRun"("institutionId", "reportTemplate");

-- AddForeignKey
ALTER TABLE "CommReportSchedule" ADD CONSTRAINT "CommReportSchedule_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommReportRun" ADD CONSTRAINT "CommReportRun_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
