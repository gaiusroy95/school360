-- AlterTable
ALTER TABLE "AcademicSubjectAllocation" ADD COLUMN "teacherEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicSubjectAllocation" ADD COLUMN "teacherPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicSubjectAllocation" ADD COLUMN "courseStartDate" TIMESTAMP(3);
ALTER TABLE "AcademicSubjectAllocation" ADD COLUMN "courseCompletionDeadline" TIMESTAMP(3);
ALTER TABLE "AcademicSubjectAllocation" ADD COLUMN "revisionDeadline" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AcademicSyllabusChapter" ADD COLUMN "revisionDeadline" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AcademicSubjectAllocation_institutionId_teacherName_idx" ON "AcademicSubjectAllocation"("institutionId", "teacherName");
