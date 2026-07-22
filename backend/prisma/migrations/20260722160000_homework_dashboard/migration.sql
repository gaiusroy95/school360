-- AlterTable
ALTER TABLE "AcademicHomework" ADD COLUMN "teacherName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicHomework" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AcademicHomework_institutionId_assignedDate_idx" ON "AcademicHomework"("institutionId", "assignedDate");
CREATE INDEX "AcademicHomework_institutionId_className_sectionName_subjectName_idx" ON "AcademicHomework"("institutionId", "className", "sectionName", "subjectName");
