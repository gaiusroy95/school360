-- CreateTable
CREATE TABLE "LibReportSchedule" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "reportTemplate" TEXT NOT NULL,
    "reportName" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'WEEKLY',
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "recipients" TEXT NOT NULL DEFAULT '',
    "cronExpr" TEXT NOT NULL DEFAULT '0 8 * * 1',
    "branchId" TEXT NOT NULL DEFAULT '',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT 'Librarian',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibReportSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibReportRun" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "reportTemplate" TEXT NOT NULL,
    "reportName" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "exportFormat" TEXT NOT NULL DEFAULT '',
    "branchId" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT 'Librarian',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibReportRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LibReportSchedule_institutionId_status_idx" ON "LibReportSchedule"("institutionId", "status");
CREATE INDEX "LibReportRun_institutionId_createdAt_idx" ON "LibReportRun"("institutionId", "createdAt");
CREATE INDEX "LibReportRun_institutionId_reportTemplate_idx" ON "LibReportRun"("institutionId", "reportTemplate");

-- AddForeignKey
ALTER TABLE "LibReportSchedule" ADD CONSTRAINT "LibReportSchedule_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibReportRun" ADD CONSTRAINT "LibReportRun_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
