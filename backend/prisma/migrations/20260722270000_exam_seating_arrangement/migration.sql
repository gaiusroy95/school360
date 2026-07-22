-- CreateEnum
CREATE TYPE "ExamSeatingPlanStatus" AS ENUM ('DRAFT', 'FINALIZED', 'EXAM_CALL_ISSUED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "ExamSeatingPlan" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "title" TEXT NOT NULL,
    "examDate" DATE NOT NULL,
    "status" "ExamSeatingPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "seriesPrefix" TEXT NOT NULL DEFAULT 'SER',
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "totalRooms" INTEGER NOT NULL DEFAULT 0,
    "examCallIssuedAt" TIMESTAMP(3),
    "examCallIssuedBy" TEXT NOT NULL DEFAULT '',
    "notificationsSentAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSeatingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSeatingRoom" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "buildingName" TEXT NOT NULL DEFAULT '',
    "capacity" INTEGER NOT NULL DEFAULT 40,
    "invigilatorName" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSeatingRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSeatingAssignment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "seriesNumber" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "rollLabel" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSeatingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSeatingNotification" (
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

    CONSTRAINT "ExamSeatingNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamSeatingPlan_institutionId_recordId_key" ON "ExamSeatingPlan"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "ExamSeatingPlan_institutionId_academicYear_examDate_idx" ON "ExamSeatingPlan"("institutionId", "academicYear", "examDate");

-- CreateIndex
CREATE INDEX "ExamSeatingPlan_institutionId_status_idx" ON "ExamSeatingPlan"("institutionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSeatingRoom_planId_roomNumber_key" ON "ExamSeatingRoom"("planId", "roomNumber");

-- CreateIndex
CREATE INDEX "ExamSeatingRoom_planId_sortOrder_idx" ON "ExamSeatingRoom"("planId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSeatingAssignment_planId_studentId_key" ON "ExamSeatingAssignment"("planId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSeatingAssignment_planId_seriesNumber_key" ON "ExamSeatingAssignment"("planId", "seriesNumber");

-- CreateIndex
CREATE INDEX "ExamSeatingAssignment_planId_roomId_idx" ON "ExamSeatingAssignment"("planId", "roomId");

-- CreateIndex
CREATE INDEX "ExamSeatingAssignment_institutionId_studentId_idx" ON "ExamSeatingAssignment"("institutionId", "studentId");

-- CreateIndex
CREATE INDEX "ExamSeatingNotification_planId_channel_idx" ON "ExamSeatingNotification"("planId", "channel");

-- AddForeignKey
ALTER TABLE "ExamSeatingPlan" ADD CONSTRAINT "ExamSeatingPlan_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSeatingRoom" ADD CONSTRAINT "ExamSeatingRoom_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ExamSeatingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSeatingAssignment" ADD CONSTRAINT "ExamSeatingAssignment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ExamSeatingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSeatingAssignment" ADD CONSTRAINT "ExamSeatingAssignment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ExamSeatingRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSeatingAssignment" ADD CONSTRAINT "ExamSeatingAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSeatingNotification" ADD CONSTRAINT "ExamSeatingNotification_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ExamSeatingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
