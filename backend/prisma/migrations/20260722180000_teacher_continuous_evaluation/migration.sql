-- CreateEnum
CREATE TYPE "AcademicTeacherEvalStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'COMPLETED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "AcademicTeacherPerformanceBand" AS ENUM ('EXCELLENT', 'GOOD', 'AVERAGE', 'NEEDS_IMPROVEMENT');

-- CreateTable
CREATE TABLE "AcademicTeacherDevCycle" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "cycleNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "evaluationDueDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "calendarEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicTeacherDevCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicTeacherEvaluation" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "devCycleId" TEXT NOT NULL,
    "teacherName" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'General',
    "className" TEXT NOT NULL DEFAULT '',
    "sectionName" TEXT NOT NULL DEFAULT '',
    "subjectName" TEXT NOT NULL DEFAULT '',
    "taskActionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taskActionNotes" TEXT NOT NULL DEFAULT '',
    "taskActionEvidence" TEXT NOT NULL DEFAULT '',
    "improvementPlanScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "improvementPlanNotes" TEXT NOT NULL DEFAULT '',
    "improvementPlanDetails" TEXT NOT NULL DEFAULT '',
    "parentEngagementScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parentEngagementNotes" TEXT NOT NULL DEFAULT '',
    "parentEngagementCount" INTEGER NOT NULL DEFAULT 0,
    "parentFeedbackScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parentFeedbackNotes" TEXT NOT NULL DEFAULT '',
    "parentFeedbackCount" INTEGER NOT NULL DEFAULT 0,
    "studentFeedbackScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "studentFeedbackNotes" TEXT NOT NULL DEFAULT '',
    "studentFeedbackCount" INTEGER NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performanceBand" "AcademicTeacherPerformanceBand" NOT NULL DEFAULT 'AVERAGE',
    "status" "AcademicTeacherEvalStatus" NOT NULL DEFAULT 'DRAFT',
    "evaluatedBy" TEXT NOT NULL DEFAULT '',
    "evaluatedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicTeacherEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicTeacherDevCycle_institutionId_recordId_key" ON "AcademicTeacherDevCycle"("institutionId", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicTeacherDevCycle_institutionId_academicYear_cycleNumber_key" ON "AcademicTeacherDevCycle"("institutionId", "academicYear", "cycleNumber");

-- CreateIndex
CREATE INDEX "AcademicTeacherDevCycle_institutionId_academicYear_idx" ON "AcademicTeacherDevCycle"("institutionId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicTeacherEvaluation_institutionId_recordId_key" ON "AcademicTeacherEvaluation"("institutionId", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicTeacherEvaluation_institutionId_devCycleId_teacherName_className_sectionName_subjectName_key" ON "AcademicTeacherEvaluation"("institutionId", "devCycleId", "teacherName", "className", "sectionName", "subjectName");

-- CreateIndex
CREATE INDEX "AcademicTeacherEvaluation_institutionId_academicYear_teacherName_idx" ON "AcademicTeacherEvaluation"("institutionId", "academicYear", "teacherName");

-- CreateIndex
CREATE INDEX "AcademicTeacherEvaluation_institutionId_devCycleId_idx" ON "AcademicTeacherEvaluation"("institutionId", "devCycleId");

-- AddForeignKey
ALTER TABLE "AcademicTeacherDevCycle" ADD CONSTRAINT "AcademicTeacherDevCycle_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicTeacherEvaluation" ADD CONSTRAINT "AcademicTeacherEvaluation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicTeacherEvaluation" ADD CONSTRAINT "AcademicTeacherEvaluation_devCycleId_fkey" FOREIGN KEY ("devCycleId") REFERENCES "AcademicTeacherDevCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
