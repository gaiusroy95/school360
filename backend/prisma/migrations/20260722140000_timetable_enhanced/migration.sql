-- CreateEnum
CREATE TYPE "AcademicPeriodType" AS ENUM ('THEORY', 'PRACTICAL', 'LAB', 'SPORTS', 'EVENT');

-- AlterTable
ALTER TABLE "AcademicTimetableSlot" ADD COLUMN "term" TEXT NOT NULL DEFAULT 'Term 1';
ALTER TABLE "AcademicTimetableSlot" ADD COLUMN "periodType" "AcademicPeriodType" NOT NULL DEFAULT 'THEORY';
ALTER TABLE "AcademicTimetableSlot" ADD COLUMN "room" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicTimetableSlot" ADD COLUMN "effectiveFrom" TIMESTAMP(3);
ALTER TABLE "AcademicTimetableSlot" ADD COLUMN "effectiveTo" TIMESTAMP(3);
ALTER TABLE "AcademicTimetableSlot" ADD COLUMN "versionLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicTimetableSlot" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "AcademicTimetableSlot" ADD COLUMN "notes" TEXT NOT NULL DEFAULT '';

-- RenameIndex (if old index exists without map name)
DROP INDEX IF EXISTS "AcademicTimetableSlot_institutionId_academicYear_className_sectionName_idx";
CREATE INDEX "AcademicTimetableSlot_inst_year_class_sec_idx" ON "AcademicTimetableSlot"("institutionId", "academicYear", "className", "sectionName");
CREATE INDEX "AcademicTimetableSlot_inst_year_teacher_idx" ON "AcademicTimetableSlot"("institutionId", "academicYear", "teacherName");
CREATE INDEX "AcademicTimetableSlot_inst_published_idx" ON "AcademicTimetableSlot"("institutionId", "publishedAt");
