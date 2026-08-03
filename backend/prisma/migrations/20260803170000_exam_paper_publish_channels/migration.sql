-- AlterTable
ALTER TABLE "ExamQuestionPaper" ADD COLUMN IF NOT EXISTS "linkToken" TEXT;
ALTER TABLE "ExamQuestionPaper" ADD COLUMN IF NOT EXISTS "linkPublishedAt" TIMESTAMP(3);
ALTER TABLE "ExamQuestionPaper" ADD COLUMN IF NOT EXISTS "linkPublishedBy" TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS "ExamQuestionPaper_linkToken_key" ON "ExamQuestionPaper"("linkToken");
CREATE INDEX IF NOT EXISTS "ExamQuestionPaper_institutionId_linkPublishedAt_idx" ON "ExamQuestionPaper"("institutionId", "linkPublishedAt");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ExamPaperStudentAccess" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordPlain" TEXT NOT NULL DEFAULT '',
    "passwordHash" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "attemptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamPaperStudentAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExamPaperStudentAccess_paperId_studentId_key" ON "ExamPaperStudentAccess"("paperId", "studentId");
CREATE UNIQUE INDEX IF NOT EXISTS "ExamPaperStudentAccess_paperId_userId_key" ON "ExamPaperStudentAccess"("paperId", "userId");
CREATE INDEX IF NOT EXISTS "ExamPaperStudentAccess_institutionId_paperId_idx" ON "ExamPaperStudentAccess"("institutionId", "paperId");
CREATE INDEX IF NOT EXISTS "ExamPaperStudentAccess_studentId_idx" ON "ExamPaperStudentAccess"("studentId");

DO $$ BEGIN
  ALTER TABLE "ExamPaperStudentAccess" ADD CONSTRAINT "ExamPaperStudentAccess_institutionId_fkey"
    FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ExamPaperStudentAccess" ADD CONSTRAINT "ExamPaperStudentAccess_paperId_fkey"
    FOREIGN KEY ("paperId") REFERENCES "ExamQuestionPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ExamPaperStudentAccess" ADD CONSTRAINT "ExamPaperStudentAccess_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
