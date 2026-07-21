-- CreateEnum
CREATE TYPE "AdmissionTestStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE "AdmissionTestSource" AS ENUM ('PDF', 'OCR', 'SYLLABUS', 'MANUAL');
CREATE TYPE "TestQuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER');
CREATE TYPE "TestDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateTable
CREATE TABLE "AdmissionTest" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "AdmissionTestStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "AdmissionTestSource" NOT NULL DEFAULT 'PDF',
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "numQuestions" INTEGER NOT NULL DEFAULT 50,
    "questionType" TEXT NOT NULL DEFAULT 'Multiple Choice',
    "difficulty" TEXT NOT NULL DEFAULT 'Medium',
    "sourceFilesMeta" JSONB NOT NULL DEFAULT '[]',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionTest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestQuestion" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "type" "TestQuestionType" NOT NULL,
    "difficulty" "TestDifficulty" NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdmissionTest_institutionId_status_idx" ON "AdmissionTest"("institutionId", "status");
CREATE INDEX "AdmissionTest_institutionId_createdAt_idx" ON "AdmissionTest"("institutionId", "createdAt");
CREATE INDEX "TestQuestion_testId_sortOrder_idx" ON "TestQuestion"("testId", "sortOrder");

-- AddForeignKey
ALTER TABLE "AdmissionTest" ADD CONSTRAINT "AdmissionTest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "AdmissionTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
