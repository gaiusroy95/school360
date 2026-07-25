ALTER TABLE "LibSettings" ADD COLUMN IF NOT EXISTS "librarianWaiverThreshold" DOUBLE PRECISION NOT NULL DEFAULT 100;

CREATE TABLE IF NOT EXISTS "LibFine" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "issueId" TEXT,
    "transactionRef" TEXT NOT NULL DEFAULT '',
    "fineType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waivedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fineDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "description" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "feeLedgerPushed" BOOLEAN NOT NULL DEFAULT false,
    "lastAccruedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibFine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibFinePayment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "fineId" TEXT,
    "memberId" TEXT NOT NULL,
    "transactionRef" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "receiptNo" TEXT NOT NULL DEFAULT '',
    "collectedBy" TEXT NOT NULL DEFAULT 'Librarian',
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibFinePayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibFineWaiver" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "fineId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "waiverAmount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibFineWaiver_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LibFine_institutionId_memberId_status_idx" ON "LibFine"("institutionId", "memberId", "status");
CREATE INDEX IF NOT EXISTS "LibFine_institutionId_fineDate_idx" ON "LibFine"("institutionId", "fineDate");
CREATE INDEX IF NOT EXISTS "LibFine_institutionId_transactionRef_idx" ON "LibFine"("institutionId", "transactionRef");
CREATE UNIQUE INDEX IF NOT EXISTS "LibFinePayment_institutionId_transactionRef_key" ON "LibFinePayment"("institutionId", "transactionRef");
CREATE INDEX IF NOT EXISTS "LibFinePayment_institutionId_memberId_paidAt_idx" ON "LibFinePayment"("institutionId", "memberId", "paidAt");
CREATE INDEX IF NOT EXISTS "LibFinePayment_institutionId_paidAt_idx" ON "LibFinePayment"("institutionId", "paidAt");
CREATE INDEX IF NOT EXISTS "LibFineWaiver_institutionId_status_idx" ON "LibFineWaiver"("institutionId", "status");
CREATE INDEX IF NOT EXISTS "LibFineWaiver_fineId_idx" ON "LibFineWaiver"("fineId");

ALTER TABLE "LibFine" ADD CONSTRAINT "LibFine_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibFine" ADD CONSTRAINT "LibFine_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LibMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibFine" ADD CONSTRAINT "LibFine_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "LibIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibFinePayment" ADD CONSTRAINT "LibFinePayment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibFinePayment" ADD CONSTRAINT "LibFinePayment_fineId_fkey" FOREIGN KEY ("fineId") REFERENCES "LibFine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibFinePayment" ADD CONSTRAINT "LibFinePayment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LibMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibFineWaiver" ADD CONSTRAINT "LibFineWaiver_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibFineWaiver" ADD CONSTRAINT "LibFineWaiver_fineId_fkey" FOREIGN KEY ("fineId") REFERENCES "LibFine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibFineWaiver" ADD CONSTRAINT "LibFineWaiver_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LibMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
