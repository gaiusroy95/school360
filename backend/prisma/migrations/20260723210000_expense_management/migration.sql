-- CreateEnum
CREATE TYPE "ExpenseEntryStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'RETURNED', 'PAID');

-- CreateEnum
CREATE TYPE "ExpensePaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'CARD', 'ONLINE', 'NEFT_RTGS');

-- CreateEnum
CREATE TYPE "ExpenseBudgetType" AS ENUM ('ANNUAL', 'MONTHLY', 'DEPARTMENT', 'CATEGORY', 'BRANCH', 'EVENT', 'PROJECT');

-- CreateEnum
CREATE TYPE "ExpenseRecurringFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "ExpenseApprovalStage" AS ENUM ('STAFF', 'DEPARTMENT_HEAD', 'ACCOUNTS', 'PRINCIPAL', 'MANAGEMENT', 'COMPLETED');

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupName" TEXT NOT NULL DEFAULT '',
    "status" "FeeMasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseHead" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "FeeMasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseHead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseVendor" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "vendorCode" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "gstin" TEXT NOT NULL DEFAULT '',
    "pan" TEXT NOT NULL DEFAULT '',
    "bankAccount" TEXT NOT NULL DEFAULT '',
    "bankIfsc" TEXT NOT NULL DEFAULT '',
    "paymentTerms" TEXT NOT NULL DEFAULT 'Net 30',
    "outstandingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contractExpiry" DATE,
    "amcExpiry" DATE,
    "status" "FeeMasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseEntry" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "expenseDate" DATE NOT NULL,
    "categoryId" TEXT NOT NULL,
    "headId" TEXT,
    "department" TEXT NOT NULL DEFAULT 'General',
    "campus" TEXT NOT NULL DEFAULT 'Main Campus',
    "branch" TEXT NOT NULL DEFAULT 'Main Branch',
    "vendorId" TEXT,
    "invoiceNumber" TEXT NOT NULL DEFAULT '',
    "purchaseOrderRef" TEXT NOT NULL DEFAULT '',
    "paymentMethod" "ExpensePaymentMethod" NOT NULL DEFAULT 'CASH',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxBreakdown" JSONB NOT NULL DEFAULT '{}',
    "budgetCode" TEXT NOT NULL DEFAULT '',
    "costCenter" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "billUploadName" TEXT NOT NULL DEFAULT '',
    "status" "ExpenseEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStage" "ExpenseApprovalStage" NOT NULL DEFAULT 'STAFF',
    "assetType" TEXT NOT NULL DEFAULT '',
    "assetRef" TEXT NOT NULL DEFAULT '',
    "recurringId" TEXT,
    "remarks" TEXT NOT NULL DEFAULT '',
    "paidAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseApproval" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "stage" "ExpenseApprovalStage" NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'APPROVE',
    "actorName" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "digitalSignature" TEXT NOT NULL DEFAULT '',
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseBudget" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "budgetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "budgetType" "ExpenseBudgetType" NOT NULL DEFAULT 'ANNUAL',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "department" TEXT NOT NULL DEFAULT '',
    "categoryId" TEXT,
    "campus" TEXT NOT NULL DEFAULT '',
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "allocatedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "alertThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "status" "FeeMasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseRecurring" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT,
    "headId" TEXT,
    "vendorId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "frequency" "ExpenseRecurringFrequency" NOT NULL DEFAULT 'MONTHLY',
    "nextDueDate" DATE NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'General',
    "campus" TEXT NOT NULL DEFAULT 'Main Campus',
    "paymentMethod" "ExpensePaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "autoCreate" BOOLEAN NOT NULL DEFAULT false,
    "status" "FeeMasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastGeneratedAt" TIMESTAMP(3),
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseRecurring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseReimbursement" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "employeeName" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'General',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "billUploadName" TEXT NOT NULL DEFAULT '',
    "status" "ExpenseEntryStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseReimbursement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_institutionId_code_key" ON "ExpenseCategory"("institutionId", "code");

-- CreateIndex
CREATE INDEX "ExpenseCategory_institutionId_groupName_idx" ON "ExpenseCategory"("institutionId", "groupName");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseHead_institutionId_code_key" ON "ExpenseHead"("institutionId", "code");

-- CreateIndex
CREATE INDEX "ExpenseHead_categoryId_idx" ON "ExpenseHead"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseVendor_institutionId_vendorCode_key" ON "ExpenseVendor"("institutionId", "vendorCode");

-- CreateIndex
CREATE INDEX "ExpenseVendor_institutionId_status_idx" ON "ExpenseVendor"("institutionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseEntry_institutionId_expenseId_key" ON "ExpenseEntry"("institutionId", "expenseId");

-- CreateIndex
CREATE INDEX "ExpenseEntry_institutionId_expenseDate_status_idx" ON "ExpenseEntry"("institutionId", "expenseDate", "status");

-- CreateIndex
CREATE INDEX "ExpenseEntry_institutionId_academicYear_department_idx" ON "ExpenseEntry"("institutionId", "academicYear", "department");

-- CreateIndex
CREATE INDEX "ExpenseEntry_institutionId_campus_idx" ON "ExpenseEntry"("institutionId", "campus");

-- CreateIndex
CREATE INDEX "ExpenseEntry_categoryId_idx" ON "ExpenseEntry"("categoryId");

-- CreateIndex
CREATE INDEX "ExpenseEntry_vendorId_idx" ON "ExpenseEntry"("vendorId");

-- CreateIndex
CREATE INDEX "ExpenseApproval_entryId_stage_idx" ON "ExpenseApproval"("entryId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseBudget_institutionId_budgetCode_key" ON "ExpenseBudget"("institutionId", "budgetCode");

-- CreateIndex
CREATE INDEX "ExpenseBudget_institutionId_academicYear_budgetType_idx" ON "ExpenseBudget"("institutionId", "academicYear", "budgetType");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseRecurring_institutionId_templateCode_key" ON "ExpenseRecurring"("institutionId", "templateCode");

-- CreateIndex
CREATE INDEX "ExpenseRecurring_institutionId_status_nextDueDate_idx" ON "ExpenseRecurring"("institutionId", "status", "nextDueDate");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseReimbursement_institutionId_requestId_key" ON "ExpenseReimbursement"("institutionId", "requestId");

-- CreateIndex
CREATE INDEX "ExpenseReimbursement_institutionId_status_academicYear_idx" ON "ExpenseReimbursement"("institutionId", "status", "academicYear");

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseHead" ADD CONSTRAINT "ExpenseHead_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseHead" ADD CONSTRAINT "ExpenseHead_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseVendor" ADD CONSTRAINT "ExpenseVendor_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_headId_fkey" FOREIGN KEY ("headId") REFERENCES "ExpenseHead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "ExpenseVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseApproval" ADD CONSTRAINT "ExpenseApproval_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ExpenseEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseBudget" ADD CONSTRAINT "ExpenseBudget_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseBudget" ADD CONSTRAINT "ExpenseBudget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseRecurring" ADD CONSTRAINT "ExpenseRecurring_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseRecurring" ADD CONSTRAINT "ExpenseRecurring_headId_fkey" FOREIGN KEY ("headId") REFERENCES "ExpenseHead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseRecurring" ADD CONSTRAINT "ExpenseRecurring_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "ExpenseVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReimbursement" ADD CONSTRAINT "ExpenseReimbursement_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
