-- AlterTable AcademicSyllabusChapter
ALTER TABLE "AcademicSyllabusChapter" ADD COLUMN IF NOT EXISTS "sectionName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicSyllabusChapter" ADD COLUMN IF NOT EXISTS "boardTopicCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicSyllabusChapter" ADD COLUMN IF NOT EXISTS "plannedStartDate" TIMESTAMP(3);
ALTER TABLE "AcademicSyllabusChapter" ADD COLUMN IF NOT EXISTS "plannedEndDate" TIMESTAMP(3);

-- AlterTable AcademicLessonPlan
ALTER TABLE "AcademicLessonPlan" ADD COLUMN IF NOT EXISTS "syllabusChapterId" TEXT;
ALTER TABLE "AcademicLessonPlan" ADD COLUMN IF NOT EXISTS "resources" JSONB NOT NULL DEFAULT '[]';

-- CreateTable AcademicCurriculum
CREATE TABLE IF NOT EXISTS "AcademicCurriculum" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "boardName" TEXT NOT NULL DEFAULT 'CBSE',
    "boardCode" TEXT NOT NULL DEFAULT '',
    "standardAlignment" TEXT NOT NULL DEFAULT '',
    "termSystem" TEXT NOT NULL DEFAULT 'Terms',
    "terms" TEXT NOT NULL DEFAULT 'Term 1, Term 2',
    "gradingSystem" TEXT NOT NULL DEFAULT 'Percentage',
    "maxMarks" INTEGER NOT NULL DEFAULT 100,
    "passMarks" INTEGER NOT NULL DEFAULT 33,
    "weightageEnabled" BOOLEAN NOT NULL DEFAULT false,
    "assessmentWeightage" JSONB NOT NULL DEFAULT '{}',
    "complianceNotes" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicCurriculum_pkey" PRIMARY KEY ("id")
);

-- CreateTable StudentSubjectElective
CREATE TABLE IF NOT EXISTS "StudentSubjectElective" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL DEFAULT '',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSubjectElective_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AcademicCurriculum_institutionId_recordId_key" ON "AcademicCurriculum"("institutionId", "recordId");
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicCurriculum_institutionId_academicYear_key" ON "AcademicCurriculum"("institutionId", "academicYear");
CREATE INDEX IF NOT EXISTS "AcademicCurriculum_institutionId_isActive_idx" ON "AcademicCurriculum"("institutionId", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "StudentSubjectElective_institutionId_recordId_key" ON "StudentSubjectElective"("institutionId", "recordId");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentSubjectElective_institutionId_academicYear_studentId_subjectId_key" ON "StudentSubjectElective"("institutionId", "academicYear", "studentId", "subjectId");
CREATE INDEX IF NOT EXISTS "StudentSubjectElective_institutionId_academicYear_className_sectionName_idx" ON "StudentSubjectElective"("institutionId", "academicYear", "className", "sectionName");
CREATE INDEX IF NOT EXISTS "StudentSubjectElective_studentId_idx" ON "StudentSubjectElective"("studentId");

CREATE INDEX IF NOT EXISTS "AcademicSyllabusChapter_institutionId_academicYear_className_sectionName_subjectName_idx" ON "AcademicSyllabusChapter"("institutionId", "academicYear", "className", "sectionName", "subjectName");
CREATE INDEX IF NOT EXISTS "AcademicLessonPlan_syllabusChapterId_idx" ON "AcademicLessonPlan"("syllabusChapterId");

DO $$ BEGIN
  ALTER TABLE "AcademicCurriculum" ADD CONSTRAINT "AcademicCurriculum_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "StudentSubjectElective" ADD CONSTRAINT "StudentSubjectElective_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AcademicLessonPlan" ADD CONSTRAINT "AcademicLessonPlan_syllabusChapterId_fkey" FOREIGN KEY ("syllabusChapterId") REFERENCES "AcademicSyllabusChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
