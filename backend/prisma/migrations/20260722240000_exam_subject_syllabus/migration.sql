-- CreateEnum
CREATE TYPE "ExamSyllabusCategory" AS ENUM ('CLASS_TEST_SERIES', 'UNIT_TEST', 'MID_TERM', 'ANNUAL_EXAM');

-- CreateTable
CREATE TABLE "ExamSubjectSyllabus" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "category" "ExamSyllabusCategory" NOT NULL,
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL DEFAULT '',
    "subjectName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "unitsCovered" TEXT NOT NULL DEFAULT '',
    "topics" JSONB NOT NULL DEFAULT '[]',
    "maxMarks" INTEGER NOT NULL DEFAULT 25,
    "weightagePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER NOT NULL DEFAULT 45,
    "plannedMonth" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Published',
    "notes" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSubjectSyllabus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamSubjectSyllabus_institutionId_recordId_key" ON "ExamSubjectSyllabus"("institutionId", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSubjectSyllabus_institutionId_academicYear_category_className_sectionName_subjectName_key" ON "ExamSubjectSyllabus"("institutionId", "academicYear", "category", "className", "sectionName", "subjectName");

-- CreateIndex
CREATE INDEX "ExamSubjectSyllabus_institutionId_academicYear_className_subjectName_idx" ON "ExamSubjectSyllabus"("institutionId", "academicYear", "className", "subjectName");

-- CreateIndex
CREATE INDEX "ExamSubjectSyllabus_institutionId_academicYear_category_idx" ON "ExamSubjectSyllabus"("institutionId", "academicYear", "category");

-- AddForeignKey
ALTER TABLE "ExamSubjectSyllabus" ADD CONSTRAINT "ExamSubjectSyllabus_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
