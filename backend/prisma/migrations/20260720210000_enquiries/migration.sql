-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'IN_PROCESS', 'FOLLOW_UP', 'CONVERTED', 'NOT_INTERESTED');

-- CreateEnum
CREATE TYPE "EnquiryActivityType" AS ENUM ('SYSTEM', 'CALL', 'EMAIL', 'SMS', 'STATUS_CHANGE', 'NOTE', 'MEETING', 'VISIT', 'ASSIGN');

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "enquiryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enquirerName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "classInterested" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'Website',
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "assignedTo" TEXT NOT NULL DEFAULT '',
    "nextFollowUp" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnquiryActivity" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "type" "EnquiryActivityType" NOT NULL DEFAULT 'SYSTEM',
    "description" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL DEFAULT 'System',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnquiryActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpTask" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL DEFAULT '',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Enquiry_institutionId_status_idx" ON "Enquiry"("institutionId", "status");

-- CreateIndex
CREATE INDEX "Enquiry_institutionId_enquiryDate_idx" ON "Enquiry"("institutionId", "enquiryDate");

-- CreateIndex
CREATE INDEX "Enquiry_institutionId_source_idx" ON "Enquiry"("institutionId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_institutionId_enquiryId_key" ON "Enquiry"("institutionId", "enquiryId");

-- CreateIndex
CREATE INDEX "EnquiryActivity_enquiryId_createdAt_idx" ON "EnquiryActivity"("enquiryId", "createdAt");

-- CreateIndex
CREATE INDEX "FollowUpTask_enquiryId_dueDate_idx" ON "FollowUpTask"("enquiryId", "dueDate");

-- CreateIndex
CREATE INDEX "FollowUpTask_dueDate_status_idx" ON "FollowUpTask"("dueDate", "status");

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryActivity" ADD CONSTRAINT "EnquiryActivity_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
