-- CreateEnum
CREATE TYPE "ExamInvigilationPlanStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ROTATED', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ExamInvigilatorRole" AS ENUM ('PRIMARY', 'CO_INVIGILATOR', 'FLOOR_SUPERVISOR', 'RELIEF');

-- CreateEnum
CREATE TYPE "ExamInvigilationDutyStatus" AS ENUM ('ASSIGNED', 'PRESENT', 'ABSENT', 'REPLACED');

-- CreateTable
CREATE TABLE "ExamInvigilationPlan" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "title" TEXT NOT NULL,
    "examDate" DATE NOT NULL,
    "seatingPlanId" TEXT,
    "status" "ExamInvigilationPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "teamSize" INTEGER NOT NULL DEFAULT 2,
    "rotationOffset" INTEGER NOT NULL DEFAULT 0,
    "autoRotateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRotatedAt" TIMESTAMP(3),
    "publishedToMobile" BOOLEAN NOT NULL DEFAULT false,
    "mobilePublishedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamInvigilationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamInvigilationDuty" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "teacherProfileId" TEXT,
    "staffProfileId" TEXT,
    "personName" TEXT NOT NULL,
    "personMobile" TEXT NOT NULL DEFAULT '',
    "personEmail" TEXT NOT NULL DEFAULT '',
    "employeeCode" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '',
    "designation" TEXT NOT NULL DEFAULT '',
    "role" "ExamInvigilatorRole" NOT NULL DEFAULT 'PRIMARY',
    "roomNumber" TEXT NOT NULL,
    "buildingName" TEXT NOT NULL DEFAULT '',
    "areaLabel" TEXT NOT NULL DEFAULT '',
    "seatingRoomId" TEXT,
    "teamNumber" INTEGER NOT NULL DEFAULT 1,
    "shiftStart" TEXT NOT NULL DEFAULT '09:00',
    "shiftEnd" TEXT NOT NULL DEFAULT '12:00',
    "status" "ExamInvigilationDutyStatus" NOT NULL DEFAULT 'ASSIGNED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamInvigilationDuty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamInvigilationRotationState" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "dutyCounts" JSONB NOT NULL DEFAULT '{}',
    "lastRunDate" DATE,
    "lastRunAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamInvigilationRotationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamInvigilationNotification" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientMobile" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "message" TEXT NOT NULL DEFAULT '',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamInvigilationNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamInvigilationPlan_institutionId_recordId_key" ON "ExamInvigilationPlan"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "ExamInvigilationPlan_institutionId_academicYear_examDate_idx" ON "ExamInvigilationPlan"("institutionId", "academicYear", "examDate");

-- CreateIndex
CREATE INDEX "ExamInvigilationPlan_institutionId_status_idx" ON "ExamInvigilationPlan"("institutionId", "status");

-- CreateIndex
CREATE INDEX "ExamInvigilationDuty_planId_roomNumber_idx" ON "ExamInvigilationDuty"("planId", "roomNumber");

-- CreateIndex
CREATE INDEX "ExamInvigilationDuty_planId_teamNumber_idx" ON "ExamInvigilationDuty"("planId", "teamNumber");

-- CreateIndex
CREATE INDEX "ExamInvigilationDuty_institutionId_teacherProfileId_idx" ON "ExamInvigilationDuty"("institutionId", "teacherProfileId");

-- CreateIndex
CREATE INDEX "ExamInvigilationDuty_institutionId_staffProfileId_idx" ON "ExamInvigilationDuty"("institutionId", "staffProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamInvigilationRotationState_institutionId_academicYear_key" ON "ExamInvigilationRotationState"("institutionId", "academicYear");

-- CreateIndex
CREATE INDEX "ExamInvigilationNotification_planId_channel_idx" ON "ExamInvigilationNotification"("planId", "channel");

-- AddForeignKey
ALTER TABLE "ExamInvigilationPlan" ADD CONSTRAINT "ExamInvigilationPlan_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamInvigilationPlan" ADD CONSTRAINT "ExamInvigilationPlan_seatingPlanId_fkey" FOREIGN KEY ("seatingPlanId") REFERENCES "ExamSeatingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamInvigilationDuty" ADD CONSTRAINT "ExamInvigilationDuty_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ExamInvigilationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamInvigilationDuty" ADD CONSTRAINT "ExamInvigilationDuty_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "TeacherAttendanceProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamInvigilationDuty" ADD CONSTRAINT "ExamInvigilationDuty_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffAttendanceProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamInvigilationDuty" ADD CONSTRAINT "ExamInvigilationDuty_seatingRoomId_fkey" FOREIGN KEY ("seatingRoomId") REFERENCES "ExamSeatingRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamInvigilationRotationState" ADD CONSTRAINT "ExamInvigilationRotationState_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamInvigilationNotification" ADD CONSTRAINT "ExamInvigilationNotification_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ExamInvigilationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
