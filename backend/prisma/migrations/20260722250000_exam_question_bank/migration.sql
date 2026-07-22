-- CreateEnum
CREATE TYPE "ExamPaperSource" AS ENUM ('AI_PDF', 'OCR', 'MANUAL', 'SYLLABUS');
CREATE TYPE "ExamPaperPurpose" AS ENUM ('CLASS_TEST', 'UNIT_TEST', 'MID_TERM', 'ANNUAL_EXAM', 'ENTRANCE_TEST', 'PRACTICE');
CREATE TYPE "ExamPaperStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "ExamQuestionPaper" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL DEFAULT '',
    "subjectName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "purpose" "ExamPaperPurpose" NOT NULL DEFAULT 'PRACTICE',
    "source" "ExamPaperSource" NOT NULL DEFAULT 'MANUAL',
    "status" "ExamPaperStatus" NOT NULL DEFAULT 'DRAFT',
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "numQuestions" INTEGER NOT NULL DEFAULT 0,
    "questionType" TEXT NOT NULL DEFAULT 'Multiple Choice',
    "difficulty" TEXT NOT NULL DEFAULT 'Medium',
    "passMarksPercent" INTEGER NOT NULL DEFAULT 33,
    "isDigitalExam" BOOLEAN NOT NULL DEFAULT true,
    "sourceFilesMeta" JSONB NOT NULL DEFAULT '[]',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamQuestionPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamQuestionPaperQuestion" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "type" "TestQuestionType" NOT NULL,
    "difficulty" "TestDifficulty" NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" TEXT,
    "marks" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "autoGradable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamQuestionPaperQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamDigitalExamAttempt" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "studentId" TEXT,
    "candidateName" TEXT NOT NULL DEFAULT '',
    "candidateRef" TEXT NOT NULL DEFAULT '',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "answers" JSONB NOT NULL DEFAULT '{}',
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "percentScore" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "resultBreakdown" JSONB,
    "autoScored" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamDigitalExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamQuestionPaper_institutionId_recordId_key" ON "ExamQuestionPaper"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "ExamQuestionPaper_institutionId_academicYear_className_subjectName_idx" ON "ExamQuestionPaper"("institutionId", "academicYear", "className", "subjectName");

-- CreateIndex
CREATE INDEX "ExamQuestionPaper_institutionId_academicYear_className_sectionName_subjectName_idx" ON "ExamQuestionPaper"("institutionId", "academicYear", "className", "sectionName", "subjectName");

-- CreateIndex
CREATE INDEX "ExamQuestionPaper_institutionId_academicYear_purpose_idx" ON "ExamQuestionPaper"("institutionId", "academicYear", "purpose");

-- CreateIndex
CREATE INDEX "ExamQuestionPaperQuestion_paperId_sortOrder_idx" ON "ExamQuestionPaperQuestion"("paperId", "sortOrder");

-- CreateIndex
CREATE INDEX "ExamDigitalExamAttempt_paperId_submittedAt_idx" ON "ExamDigitalExamAttempt"("paperId", "submittedAt");

-- CreateIndex
CREATE INDEX "ExamDigitalExamAttempt_institutionId_studentId_idx" ON "ExamDigitalExamAttempt"("institutionId", "studentId");

-- AddForeignKey
ALTER TABLE "ExamQuestionPaper" ADD CONSTRAINT "ExamQuestionPaper_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestionPaperQuestion" ADD CONSTRAINT "ExamQuestionPaperQuestion_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "ExamQuestionPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamDigitalExamAttempt" ADD CONSTRAINT "ExamDigitalExamAttempt_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamDigitalExamAttempt" ADD CONSTRAINT "ExamDigitalExamAttempt_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "ExamQuestionPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamDigitalExamAttempt" ADD CONSTRAINT "ExamDigitalExamAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
