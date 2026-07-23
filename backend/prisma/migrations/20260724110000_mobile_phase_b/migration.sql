-- AlterTable
ALTER TABLE "AcademicHomework" ADD COLUMN "attachments" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "AcademicSyllabusChapter" ADD COLUMN "teacherInstructions" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicSyllabusChapter" ADD COLUMN "lmsMediaItems" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "StudentLeaveApplication" ADD COLUMN "attachmentUrl" TEXT NOT NULL DEFAULT '';

-- CreateEnum
CREATE TYPE "FeeDueStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('CREATED', 'PAID', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "FeeDue" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "title" TEXT NOT NULL,
    "feeHead" TEXT NOT NULL DEFAULT 'tuitionFee',
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "FeeDueStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeDue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "feeDueId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL DEFAULT '',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'CREATED',
    "provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "providerOrderId" TEXT NOT NULL DEFAULT '',
    "providerPaymentId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileReminderPreference" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileReminderPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileReminderPreference_accountId_key" ON "MobileReminderPreference"("accountId");

-- CreateIndex
CREATE INDEX "FeeDue_institutionId_studentId_status_idx" ON "FeeDue"("institutionId", "studentId", "status");

-- CreateIndex
CREATE INDEX "FeeDue_institutionId_admissionNumber_academicYear_idx" ON "FeeDue"("institutionId", "admissionNumber", "academicYear");

-- CreateIndex
CREATE INDEX "PaymentOrder_institutionId_feeDueId_idx" ON "PaymentOrder"("institutionId", "feeDueId");

-- CreateIndex
CREATE INDEX "PaymentOrder_institutionId_status_idx" ON "PaymentOrder"("institutionId", "status");

-- AddForeignKey
ALTER TABLE "FeeDue" ADD CONSTRAINT "FeeDue_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_feeDueId_fkey" FOREIGN KEY ("feeDueId") REFERENCES "FeeDue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileReminderPreference" ADD CONSTRAINT "MobileReminderPreference_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MobileAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
