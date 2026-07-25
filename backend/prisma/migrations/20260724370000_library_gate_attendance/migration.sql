ALTER TABLE "LibSettings" ADD COLUMN IF NOT EXISTS "libraryClosingTime" TEXT NOT NULL DEFAULT '18:00';
ALTER TABLE "LibSettings" ADD COLUMN IF NOT EXISTS "parentGateNotifications" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LibSettings" ADD COLUMN IF NOT EXISTS "gateTerminals" JSONB NOT NULL DEFAULT '["GATE-01","GATE-02"]';

CREATE TABLE IF NOT EXISTS "LibGateLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "entryTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitTime" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "terminalId" TEXT NOT NULL DEFAULT '',
    "scanMethod" TEXT NOT NULL DEFAULT 'BARCODE',
    "gateEvent" TEXT NOT NULL DEFAULT 'IN',
    "status" TEXT NOT NULL DEFAULT 'INSIDE',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT '',
    "parentNotified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibGateLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LibGateLog_institutionId_entryTime_idx" ON "LibGateLog"("institutionId", "entryTime");
CREATE INDEX IF NOT EXISTS "LibGateLog_institutionId_memberId_status_idx" ON "LibGateLog"("institutionId", "memberId", "status");
CREATE INDEX IF NOT EXISTS "LibGateLog_institutionId_academicYear_idx" ON "LibGateLog"("institutionId", "academicYear");
CREATE INDEX IF NOT EXISTS "LibGateLog_branchId_entryTime_idx" ON "LibGateLog"("branchId", "entryTime");

ALTER TABLE "LibGateLog" ADD CONSTRAINT "LibGateLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibGateLog" ADD CONSTRAINT "LibGateLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "LibBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibGateLog" ADD CONSTRAINT "LibGateLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LibMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
