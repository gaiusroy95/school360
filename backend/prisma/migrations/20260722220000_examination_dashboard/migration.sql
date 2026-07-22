-- CreateEnum
CREATE TYPE "ExamTypeFilter" AS ENUM ('UNIT_TEST', 'MID_TERM', 'HALF_YEARLY', 'PRE_FINAL', 'FINAL_EXAMINATION');

-- CreateTable
CREATE TABLE "ExamSchedule" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "examType" "ExamTypeFilter" NOT NULL,
    "name" TEXT NOT NULL,
    "classRange" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "subjectCount" INTEGER NOT NULL DEFAULT 0,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "plannedPercent" INTEGER NOT NULL DEFAULT 100,
    "preparationPercent" INTEGER NOT NULL DEFAULT 0,
    "conductPercent" INTEGER NOT NULL DEFAULT 0,
    "evaluationPercent" INTEGER NOT NULL DEFAULT 0,
    "publishPercent" INTEGER NOT NULL DEFAULT 0,
    "isToday" BOOLEAN NOT NULL DEFAULT false,
    "todayStartTime" TEXT NOT NULL DEFAULT '',
    "todayEndTime" TEXT NOT NULL DEFAULT '',
    "todaySubject" TEXT NOT NULL DEFAULT '',
    "todaySection" TEXT NOT NULL DEFAULT '',
    "todayPresent" INTEGER NOT NULL DEFAULT 0,
    "todayAbsent" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAlert" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "alertType" TEXT NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "alertDate" DATE,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamMarksEntryProgress" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "examType" "ExamTypeFilter" NOT NULL,
    "className" TEXT NOT NULL,
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "marksEntered" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExamMarksEntryProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamDashboardStats" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "examType" "ExamTypeFilter" NOT NULL,
    "upcomingExams" INTEGER NOT NULL DEFAULT 0,
    "nextExamName" TEXT NOT NULL DEFAULT '',
    "nextExamDate" TEXT NOT NULL DEFAULT '',
    "studentsRegistered" INTEGER NOT NULL DEFAULT 0,
    "examsConducted" INTEGER NOT NULL DEFAULT 0,
    "papersCreated" INTEGER NOT NULL DEFAULT 0,
    "resultsDeclared" INTEGER NOT NULL DEFAULT 0,
    "averagePassPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "questionTotal" INTEGER NOT NULL DEFAULT 0,
    "questionSubjective" INTEGER NOT NULL DEFAULT 0,
    "questionObjective" INTEGER NOT NULL DEFAULT 0,
    "questionWithSolution" INTEGER NOT NULL DEFAULT 0,
    "resultAppeared" INTEGER NOT NULL DEFAULT 0,
    "resultPass" INTEGER NOT NULL DEFAULT 0,
    "resultFail" INTEGER NOT NULL DEFAULT 0,
    "resultHighest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resultAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "analyticsPassPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "analyticsPassDelta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "analyticsAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "analyticsAverageDelta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "analyticsImprovement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revaluationReceived" INTEGER NOT NULL DEFAULT 0,
    "revaluationUnderReview" INTEGER NOT NULL DEFAULT 0,
    "revaluationApproved" INTEGER NOT NULL DEFAULT 0,
    "revaluationRejected" INTEGER NOT NULL DEFAULT 0,
    "reportCardsGenerated" INTEGER NOT NULL DEFAULT 0,
    "reportCardsPublished" INTEGER NOT NULL DEFAULT 0,
    "reportCardsShared" INTEGER NOT NULL DEFAULT 0,
    "reportCardsPending" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamDashboardStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamQuestionSubjectStat" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "subjectName" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExamQuestionSubjectStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamTopPerformer" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "examType" "ExamTypeFilter" NOT NULL,
    "rank" INTEGER NOT NULL,
    "studentName" TEXT NOT NULL,
    "classGroup" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExamTopPerformer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamPerformanceTrend" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "termLabel" TEXT NOT NULL,
    "averagePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "passPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExamPerformanceTrend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamSchedule_institutionId_recordId_key" ON "ExamSchedule"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "ExamSchedule_institutionId_academicYear_examType_idx" ON "ExamSchedule"("institutionId", "academicYear", "examType");

-- CreateIndex
CREATE INDEX "ExamAlert_institutionId_academicYear_idx" ON "ExamAlert"("institutionId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "ExamMarksEntryProgress_institutionId_academicYear_examType_className_key" ON "ExamMarksEntryProgress"("institutionId", "academicYear", "examType", "className");

-- CreateIndex
CREATE UNIQUE INDEX "ExamDashboardStats_institutionId_academicYear_examType_key" ON "ExamDashboardStats"("institutionId", "academicYear", "examType");

-- CreateIndex
CREATE INDEX "ExamQuestionSubjectStat_institutionId_academicYear_idx" ON "ExamQuestionSubjectStat"("institutionId", "academicYear");

-- CreateIndex
CREATE INDEX "ExamTopPerformer_institutionId_academicYear_examType_idx" ON "ExamTopPerformer"("institutionId", "academicYear", "examType");

-- CreateIndex
CREATE INDEX "ExamPerformanceTrend_institutionId_academicYear_idx" ON "ExamPerformanceTrend"("institutionId", "academicYear");

-- AddForeignKey
ALTER TABLE "ExamSchedule" ADD CONSTRAINT "ExamSchedule_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAlert" ADD CONSTRAINT "ExamAlert_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamMarksEntryProgress" ADD CONSTRAINT "ExamMarksEntryProgress_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamDashboardStats" ADD CONSTRAINT "ExamDashboardStats_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestionSubjectStat" ADD CONSTRAINT "ExamQuestionSubjectStat_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTopPerformer" ADD CONSTRAINT "ExamTopPerformer_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamPerformanceTrend" ADD CONSTRAINT "ExamPerformanceTrend_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
