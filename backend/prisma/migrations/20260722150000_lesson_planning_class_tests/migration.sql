-- CreateEnum
CREATE TYPE "BloomsTaxonomyLevel" AS ENUM ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE');
CREATE TYPE "ClassTestScoreBucket" AS ENUM ('EXCELLENT', 'GOOD', 'AVERAGE', 'BELOW');

-- AlterTable AcademicLessonPlan
ALTER TABLE "AcademicLessonPlan" ADD COLUMN "objective" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicLessonPlan" ADD COLUMN "teachingMethod" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicLessonPlan" ADD COLUMN "propsUsed" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicLessonPlan" ADD COLUMN "bloomsLevel" "BloomsTaxonomyLevel" NOT NULL DEFAULT 'UNDERSTAND';
ALTER TABLE "AcademicLessonPlan" ADD COLUMN "resultMeasurement" TEXT NOT NULL DEFAULT '';

-- CreateTable AcademicClassTest
CREATE TABLE "AcademicClassTest" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "lessonPlanId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "term" TEXT NOT NULL DEFAULT 'Term 1',
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "teacherName" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "maxMarks" INTEGER NOT NULL DEFAULT 100,
    "conductedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicClassTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable AcademicClassTestScore
CREATE TABLE "AcademicClassTestScore" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "classTestId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "marksObtained" DOUBLE PRECISION NOT NULL,
    "maxMarks" INTEGER NOT NULL DEFAULT 100,
    "percentage" DOUBLE PRECISION NOT NULL,
    "bucket" "ClassTestScoreBucket" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicClassTestScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicClassTest_institutionId_recordId_key" ON "AcademicClassTest"("institutionId", "recordId");
CREATE UNIQUE INDEX "AcademicClassTest_institutionId_lessonPlanId_key" ON "AcademicClassTest"("institutionId", "lessonPlanId");
CREATE INDEX "AcademicClassTest_institutionId_academicYear_className_sectionName_idx" ON "AcademicClassTest"("institutionId", "academicYear", "className", "sectionName");

CREATE UNIQUE INDEX "AcademicClassTestScore_classTestId_studentId_key" ON "AcademicClassTestScore"("classTestId", "studentId");
CREATE INDEX "AcademicClassTestScore_institutionId_studentId_idx" ON "AcademicClassTestScore"("institutionId", "studentId");
CREATE INDEX "AcademicClassTestScore_classTestId_bucket_idx" ON "AcademicClassTestScore"("classTestId", "bucket");

-- AddForeignKey
ALTER TABLE "AcademicClassTest" ADD CONSTRAINT "AcademicClassTest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicClassTest" ADD CONSTRAINT "AcademicClassTest_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "AcademicLessonPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AcademicClassTestScore" ADD CONSTRAINT "AcademicClassTestScore_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicClassTestScore" ADD CONSTRAINT "AcademicClassTestScore_classTestId_fkey" FOREIGN KEY ("classTestId") REFERENCES "AcademicClassTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicClassTestScore" ADD CONSTRAINT "AcademicClassTestScore_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
