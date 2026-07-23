-- CreateEnum
CREATE TYPE "BankDepositStatus" AS ENUM ('PENDING', 'APPROVED', 'DEPOSITED', 'REALIZED', 'REJECTED');

-- CreateTable
CREATE TABLE "BankCashDeposit" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "depositId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "depositDate" DATE NOT NULL,
    "depositTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campus" TEXT NOT NULL DEFAULT 'Main Campus',
    "branch" TEXT NOT NULL DEFAULT 'Main Branch',
    "cashierName" TEXT NOT NULL DEFAULT '',
    "depositBy" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "bankAccount" TEXT NOT NULL DEFAULT '',
    "depositSlipNo" TEXT NOT NULL DEFAULT '',
    "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositType" TEXT NOT NULL DEFAULT 'Cash',
    "collectionDate" DATE NOT NULL,
    "totalCashCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashCounted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difference" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remarks" TEXT NOT NULL DEFAULT '',
    "slipUploadName" TEXT NOT NULL DEFAULT '',
    "status" "BankDepositStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankCashDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankChequeDeposit" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "depositId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "depositDate" DATE NOT NULL,
    "bankName" TEXT NOT NULL DEFAULT '',
    "branch" TEXT NOT NULL DEFAULT '',
    "depositSlipNo" TEXT NOT NULL DEFAULT '',
    "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCheques" INTEGER NOT NULL DEFAULT 0,
    "depositBy" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "status" "BankDepositStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "realizedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankChequeDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankChequeDepositItem" (
    "id" TEXT NOT NULL,
    "depositId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL DEFAULT '',
    "receiptNumber" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "chequeNumber" TEXT NOT NULL DEFAULT '',
    "chequeBankBranch" TEXT NOT NULL DEFAULT '',
    "depositDate" DATE NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "BankDepositStatus" NOT NULL DEFAULT 'DEPOSITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankChequeDepositItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankCashDeposit_institutionId_depositId_key" ON "BankCashDeposit"("institutionId", "depositId");

-- CreateIndex
CREATE INDEX "BankCashDeposit_institutionId_depositDate_status_idx" ON "BankCashDeposit"("institutionId", "depositDate", "status");

-- CreateIndex
CREATE INDEX "BankCashDeposit_institutionId_academicYear_idx" ON "BankCashDeposit"("institutionId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "BankChequeDeposit_institutionId_depositId_key" ON "BankChequeDeposit"("institutionId", "depositId");

-- CreateIndex
CREATE INDEX "BankChequeDeposit_institutionId_depositDate_status_idx" ON "BankChequeDeposit"("institutionId", "depositDate", "status");

-- CreateIndex
CREATE INDEX "BankChequeDeposit_institutionId_academicYear_idx" ON "BankChequeDeposit"("institutionId", "academicYear");

-- CreateIndex
CREATE INDEX "BankChequeDepositItem_depositId_idx" ON "BankChequeDepositItem"("depositId");

-- CreateIndex
CREATE INDEX "BankChequeDepositItem_receiptNumber_idx" ON "BankChequeDepositItem"("receiptNumber");

-- AddForeignKey
ALTER TABLE "BankCashDeposit" ADD CONSTRAINT "BankCashDeposit_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankChequeDeposit" ADD CONSTRAINT "BankChequeDeposit_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankChequeDepositItem" ADD CONSTRAINT "BankChequeDepositItem_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "BankChequeDeposit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
