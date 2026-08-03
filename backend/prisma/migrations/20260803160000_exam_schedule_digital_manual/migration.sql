-- CreateEnum
CREATE TYPE "ExamSessionMode" AS ENUM ('DIGITAL', 'MANUAL');

-- CreateEnum
CREATE TYPE "ExamPaperPickSource" AS ENUM ('QUESTION_BANK', 'PAPER_UPLOAD', 'NONE');

-- AlterTable ExamCalendarSession
ALTER TABLE "ExamCalendarSession" ADD COLUMN IF NOT EXISTS "examMode" "ExamSessionMode" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "ExamCalendarSession" ADD COLUMN IF NOT EXISTS "paperSource" "ExamPaperPickSource" NOT NULL DEFAULT 'NONE';
ALTER TABLE "ExamCalendarSession" ADD COLUMN IF NOT EXISTS "questionPaperId" TEXT;
ALTER TABLE "ExamCalendarSession" ADD COLUMN IF NOT EXISTS "marksAssignmentId" TEXT;
ALTER TABLE "ExamCalendarSession" ADD COLUMN IF NOT EXISTS "marksColumnKey" "ExamMarksColumnKey";
ALTER TABLE "ExamCalendarSession" ADD COLUMN IF NOT EXISTS "maxMarks" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "ExamCalendarSession" ADD COLUMN IF NOT EXISTS "publishAt" TIMESTAMP(3);
ALTER TABLE "ExamCalendarSession" ADD COLUMN IF NOT EXISTS "examLinkToken" TEXT;
ALTER TABLE "ExamCalendarSession" ADD COLUMN IF NOT EXISTS "linkPublishedAt" TIMESTAMP(3);
ALTER TABLE "ExamCalendarSession" ADD COLUMN IF NOT EXISTS "academicCalendarEventId" TEXT;
ALTER TABLE "ExamCalendarSession" ADD COLUMN IF NOT EXISTS "resultsCapturedAt" TIMESTAMP(3);
ALTER TABLE "ExamCalendarSession" ADD COLUMN IF NOT EXISTS "uploadedPaperMeta" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "ExamCalendarSession" ADD COLUMN IF NOT EXISTS "notes" TEXT NOT NULL DEFAULT '';

-- AlterTable ExamQuestionPaper
ALTER TABLE "ExamQuestionPaper" ADD COLUMN IF NOT EXISTS "scheduledPublishAt" TIMESTAMP(3);

-- Indexes / uniques
CREATE UNIQUE INDEX IF NOT EXISTS "ExamCalendarSession_examLinkToken_key" ON "ExamCalendarSession"("examLinkToken");
CREATE INDEX IF NOT EXISTS "ExamCalendarSession_institutionId_publishAt_idx" ON "ExamCalendarSession"("institutionId", "publishAt");
CREATE INDEX IF NOT EXISTS "ExamCalendarSession_questionPaperId_idx" ON "ExamCalendarSession"("questionPaperId");
CREATE INDEX IF NOT EXISTS "ExamQuestionPaper_institutionId_scheduledPublishAt_idx" ON "ExamQuestionPaper"("institutionId", "scheduledPublishAt");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "ExamCalendarSession" ADD CONSTRAINT "ExamCalendarSession_questionPaperId_fkey"
    FOREIGN KEY ("questionPaperId") REFERENCES "ExamQuestionPaper"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ExamCalendarSession" ADD CONSTRAINT "ExamCalendarSession_marksAssignmentId_fkey"
    FOREIGN KEY ("marksAssignmentId") REFERENCES "ExamSubjectTeacherAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
