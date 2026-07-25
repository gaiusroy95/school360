ALTER TABLE "LibSettings" ADD COLUMN IF NOT EXISTS "circulationRules" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "LibSettings" ADD COLUMN IF NOT EXISTS "unpaidFineThreshold" DOUBLE PRECISION NOT NULL DEFAULT 100;

ALTER TABLE "LibIssue" ADD COLUMN IF NOT EXISTS "copyId" TEXT;
ALTER TABLE "LibIssue" ADD COLUMN IF NOT EXISTS "txnNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LibIssue" ADD COLUMN IF NOT EXISTS "accessionNo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LibIssue" ADD COLUMN IF NOT EXISTS "issuedBy" TEXT NOT NULL DEFAULT 'Librarian';
ALTER TABLE "LibIssue" ADD COLUMN IF NOT EXISTS "returnedBy" TEXT NOT NULL DEFAULT '';

UPDATE "LibIssue" SET "txnNumber" = 'CIR-LEGACY-' || "id" WHERE "txnNumber" = '' OR "txnNumber" IS NULL;

CREATE TABLE IF NOT EXISTS "LibCirculationTxn" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "issueId" TEXT,
    "branchId" TEXT NOT NULL,
    "txnNumber" TEXT NOT NULL,
    "txnType" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "copyId" TEXT,
    "accessionNo" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "issueDate" DATE,
    "dueDate" DATE,
    "returnDate" DATE,
    "fineAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performedBy" TEXT NOT NULL DEFAULT 'Librarian',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibCirculationTxn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibFineLedger" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "issueId" TEXT,
    "memberId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fineType" TEXT NOT NULL DEFAULT 'OVERDUE',
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibFineLedger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LibIssue_institutionId_txnNumber_key" ON "LibIssue"("institutionId", "txnNumber");
CREATE INDEX IF NOT EXISTS "LibIssue_accessionNo_idx" ON "LibIssue"("accessionNo");
CREATE INDEX IF NOT EXISTS "LibCirculationTxn_institutionId_txnType_createdAt_idx" ON "LibCirculationTxn"("institutionId", "txnType", "createdAt");
CREATE INDEX IF NOT EXISTS "LibCirculationTxn_institutionId_academicYear_idx" ON "LibCirculationTxn"("institutionId", "academicYear");
CREATE INDEX IF NOT EXISTS "LibCirculationTxn_memberId_idx" ON "LibCirculationTxn"("memberId");
CREATE INDEX IF NOT EXISTS "LibCirculationTxn_accessionNo_idx" ON "LibCirculationTxn"("accessionNo");
CREATE INDEX IF NOT EXISTS "LibFineLedger_institutionId_memberId_status_idx" ON "LibFineLedger"("institutionId", "memberId", "status");
CREATE INDEX IF NOT EXISTS "LibFineLedger_institutionId_status_idx" ON "LibFineLedger"("institutionId", "status");

ALTER TABLE "LibIssue" ADD CONSTRAINT "LibIssue_copyId_fkey" FOREIGN KEY ("copyId") REFERENCES "LibBookCopy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibCirculationTxn" ADD CONSTRAINT "LibCirculationTxn_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibCirculationTxn" ADD CONSTRAINT "LibCirculationTxn_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "LibIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibCirculationTxn" ADD CONSTRAINT "LibCirculationTxn_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "LibBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibCirculationTxn" ADD CONSTRAINT "LibCirculationTxn_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LibMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibCirculationTxn" ADD CONSTRAINT "LibCirculationTxn_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibFineLedger" ADD CONSTRAINT "LibFineLedger_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibFineLedger" ADD CONSTRAINT "LibFineLedger_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "LibIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibFineLedger" ADD CONSTRAINT "LibFineLedger_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LibMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
