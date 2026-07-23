-- CreateEnum
CREATE TYPE "PaymentReconciliationStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'RETURNED', 'REJECTED', 'FROZEN', 'DAY_CLOSING_COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentReconciliationStage" AS ENUM ('CASHIER', 'ACCOUNTS_EXECUTIVE', 'ACCOUNTS_MANAGER', 'FINANCE_HEAD', 'PRINCIPAL_DIRECTOR', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentReconciliationAction" AS ENUM ('SUBMIT', 'APPROVE', 'REJECT', 'RETURN_FOR_CORRECTION', 'FREEZE', 'SIGN');

-- CreateTable
CREATE TABLE "PaymentReconciliation" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "reconciliationDate" DATE NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "status" "PaymentReconciliationStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStage" "PaymentReconciliationStage" NOT NULL DEFAULT 'CASHIER',
    "bankStatementTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gatewaySettlement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashDepositedToBank" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashWithdrawnFromBank" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashPayments" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bankCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openingPettyCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "previousDayOutstanding" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "principalRequired" BOOLEAN NOT NULL DEFAULT false,
    "snapshot" JSONB,
    "frozenAt" TIMESTAMP(3),
    "frozenBy" TEXT NOT NULL DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "submittedBy" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3),
    "pdfGeneratedAt" TIMESTAMP(3),
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReconciliationApproval" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "stage" "PaymentReconciliationStage" NOT NULL,
    "action" "PaymentReconciliationAction" NOT NULL,
    "actorName" TEXT NOT NULL DEFAULT '',
    "actorRole" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "digitalSignature" TEXT NOT NULL DEFAULT '',
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReconciliationApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentReconciliation_institutionId_status_reconciliationDate_idx" ON "PaymentReconciliation"("institutionId", "status", "reconciliationDate");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReconciliation_institutionId_reconciliationDate_key" ON "PaymentReconciliation"("institutionId", "reconciliationDate");

-- CreateIndex
CREATE INDEX "PaymentReconciliationApproval_reconciliationId_stage_idx" ON "PaymentReconciliationApproval"("reconciliationId", "stage");

-- AddForeignKey
ALTER TABLE "PaymentReconciliation" ADD CONSTRAINT "PaymentReconciliation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReconciliationApproval" ADD CONSTRAINT "PaymentReconciliationApproval_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "PaymentReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
