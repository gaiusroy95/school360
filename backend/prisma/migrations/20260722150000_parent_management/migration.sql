-- CreateEnum
CREATE TYPE "ParentRelationship" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN');

-- CreateEnum
CREATE TYPE "ParentCategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ParentEngagementStatus" AS ENUM ('PLANNED', 'COMPLETED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParentCommunicationChannel" AS ENUM ('SMS', 'EMAIL', 'APP', 'CALL', 'NOTICE', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ParentCommunicationStatus" AS ENUM ('PLANNED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "ParentMeetingStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED');

-- CreateEnum
CREATE TYPE "ParentConsentTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "ParentConsentResponseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ParentCategory" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "categoryGroup" TEXT NOT NULL DEFAULT 'General',
    "colorCode" TEXT NOT NULL DEFAULT '#6366f1',
    "status" "ParentCategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentCategoryAssignment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "parentKey" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "relationship" "ParentRelationship" NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentCategoryAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentEngagementEvent" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentRelationship" "ParentRelationship" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "engagementType" TEXT NOT NULL DEFAULT 'General',
    "plannedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "outcome" TEXT NOT NULL DEFAULT '',
    "studentFeedbackNotes" TEXT NOT NULL DEFAULT '',
    "status" "ParentEngagementStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentEngagementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentCommunication" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentRelationship" "ParentRelationship" NOT NULL,
    "channel" "ParentCommunicationChannel" NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "plannedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "status" "ParentCommunicationStatus" NOT NULL DEFAULT 'PLANNED',
    "isImportant" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL DEFAULT 'general',
    "academicData" JSONB NOT NULL DEFAULT '{}',
    "teacherFeedback" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentCommunication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentFeedback" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentRelationship" "ParentRelationship" NOT NULL,
    "parentName" TEXT NOT NULL DEFAULT '',
    "rating" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'General',
    "message" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentMeeting" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "className" TEXT NOT NULL DEFAULT '',
    "sectionName" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL DEFAULT '',
    "fatherName" TEXT NOT NULL DEFAULT '',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "conductedAt" TIMESTAMP(3),
    "discussionNotes" TEXT NOT NULL DEFAULT '',
    "photoUrls" JSONB NOT NULL DEFAULT '[]',
    "attendees" TEXT NOT NULL DEFAULT '',
    "status" "ParentMeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentConsentTemplate" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'General',
    "formFields" JSONB NOT NULL DEFAULT '[]',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "validUntil" TIMESTAMP(3),
    "status" "ParentConsentTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentConsentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentConsentResponse" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentRelationship" "ParentRelationship" NOT NULL DEFAULT 'FATHER',
    "status" "ParentConsentResponseStatus" NOT NULL DEFAULT 'PENDING',
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentConsentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParentCategory_institutionId_name_key" ON "ParentCategory"("institutionId", "name");

-- CreateIndex
CREATE INDEX "ParentCategory_institutionId_status_idx" ON "ParentCategory"("institutionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ParentCategoryAssignment_parentKey_categoryId_key" ON "ParentCategoryAssignment"("parentKey", "categoryId");

-- CreateIndex
CREATE INDEX "ParentCategoryAssignment_institutionId_parentKey_idx" ON "ParentCategoryAssignment"("institutionId", "parentKey");

-- CreateIndex
CREATE INDEX "ParentCategoryAssignment_studentId_idx" ON "ParentCategoryAssignment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentEngagementEvent_institutionId_recordId_key" ON "ParentEngagementEvent"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "ParentEngagementEvent_institutionId_plannedAt_idx" ON "ParentEngagementEvent"("institutionId", "plannedAt");

-- CreateIndex
CREATE INDEX "ParentEngagementEvent_institutionId_studentId_idx" ON "ParentEngagementEvent"("institutionId", "studentId");

-- CreateIndex
CREATE INDEX "ParentEngagementEvent_institutionId_status_idx" ON "ParentEngagementEvent"("institutionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ParentCommunication_institutionId_recordId_key" ON "ParentCommunication"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "ParentCommunication_institutionId_sentAt_idx" ON "ParentCommunication"("institutionId", "sentAt");

-- CreateIndex
CREATE INDEX "ParentCommunication_institutionId_studentId_idx" ON "ParentCommunication"("institutionId", "studentId");

-- CreateIndex
CREATE INDEX "ParentCommunication_institutionId_status_idx" ON "ParentCommunication"("institutionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ParentFeedback_institutionId_recordId_key" ON "ParentFeedback"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "ParentFeedback_institutionId_submittedAt_idx" ON "ParentFeedback"("institutionId", "submittedAt");

-- CreateIndex
CREATE INDEX "ParentFeedback_institutionId_studentId_idx" ON "ParentFeedback"("institutionId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentMeeting_institutionId_recordId_key" ON "ParentMeeting"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "ParentMeeting_institutionId_scheduledAt_idx" ON "ParentMeeting"("institutionId", "scheduledAt");

-- CreateIndex
CREATE INDEX "ParentMeeting_institutionId_className_sectionName_idx" ON "ParentMeeting"("institutionId", "className", "sectionName");

-- CreateIndex
CREATE INDEX "ParentMeeting_institutionId_studentId_idx" ON "ParentMeeting"("institutionId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentConsentTemplate_institutionId_recordId_key" ON "ParentConsentTemplate"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "ParentConsentTemplate_institutionId_status_idx" ON "ParentConsentTemplate"("institutionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ParentConsentResponse_templateId_studentId_parentRelationship_key" ON "ParentConsentResponse"("templateId", "studentId", "parentRelationship");

-- CreateIndex
CREATE INDEX "ParentConsentResponse_institutionId_status_idx" ON "ParentConsentResponse"("institutionId", "status");

-- CreateIndex
CREATE INDEX "ParentConsentResponse_studentId_idx" ON "ParentConsentResponse"("studentId");

-- AddForeignKey
ALTER TABLE "ParentCategory" ADD CONSTRAINT "ParentCategory_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentCategoryAssignment" ADD CONSTRAINT "ParentCategoryAssignment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentCategoryAssignment" ADD CONSTRAINT "ParentCategoryAssignment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ParentCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentEngagementEvent" ADD CONSTRAINT "ParentEngagementEvent_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentCommunication" ADD CONSTRAINT "ParentCommunication_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentFeedback" ADD CONSTRAINT "ParentFeedback_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentMeeting" ADD CONSTRAINT "ParentMeeting_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentConsentTemplate" ADD CONSTRAINT "ParentConsentTemplate_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentConsentResponse" ADD CONSTRAINT "ParentConsentResponse_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentConsentResponse" ADD CONSTRAINT "ParentConsentResponse_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ParentConsentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
