-- CreateEnum
CREATE TYPE "CoScholasticActivityStatus" AS ENUM ('PLANNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CoScholasticPerformanceBand" AS ENUM ('EXCELLENT', 'GOOD', 'AVERAGE', 'NEEDS_IMPROVEMENT');

-- AlterTable
ALTER TABLE "AcademicCoScholasticActivity" ADD COLUMN "term" TEXT NOT NULL DEFAULT 'Term 1';
ALTER TABLE "AcademicCoScholasticActivity" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'PHYSICAL_HEALTH';
ALTER TABLE "AcademicCoScholasticActivity" ADD COLUMN "subCategory" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicCoScholasticActivity" ADD COLUMN "activityType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicCoScholasticActivity" ADD COLUMN "className" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicCoScholasticActivity" ADD COLUMN "sectionName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicCoScholasticActivity" ADD COLUMN "teacherName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicCoScholasticActivity" ADD COLUMN "coTeacherName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicCoScholasticActivity" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "AcademicCoScholasticActivity" ADD COLUMN "endDate" TIMESTAMP(3);
ALTER TABLE "AcademicCoScholasticActivity" ADD COLUMN "measurementCriteria" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AcademicCoScholasticActivity" ADD COLUMN "maxScore" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "AcademicCoScholasticActivity" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Convert status from TEXT to enum
ALTER TABLE "AcademicCoScholasticActivity" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "AcademicCoScholasticActivity" ALTER COLUMN "status" TYPE "CoScholasticActivityStatus" USING (
  CASE
    WHEN LOWER("status") = 'completed' THEN 'COMPLETED'::"CoScholasticActivityStatus"
    WHEN LOWER("status") = 'scheduled' THEN 'SCHEDULED'::"CoScholasticActivityStatus"
    WHEN LOWER("status") = 'in progress' THEN 'IN_PROGRESS'::"CoScholasticActivityStatus"
    WHEN LOWER("status") = 'cancelled' THEN 'CANCELLED'::"CoScholasticActivityStatus"
    ELSE 'PLANNED'::"CoScholasticActivityStatus"
  END
);
ALTER TABLE "AcademicCoScholasticActivity" ALTER COLUMN "status" SET DEFAULT 'PLANNED';

-- CreateTable
CREATE TABLE "AcademicCoScholasticPerformance" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL DEFAULT '',
    "sectionName" TEXT NOT NULL DEFAULT '',
    "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performanceGrade" TEXT NOT NULL DEFAULT '',
    "performanceBand" "CoScholasticPerformanceBand" NOT NULL DEFAULT 'AVERAGE',
    "remarks" TEXT NOT NULL DEFAULT '',
    "recordedBy" TEXT NOT NULL DEFAULT '',
    "recordedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicCoScholasticPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicCoScholasticFeedback" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentName" TEXT NOT NULL DEFAULT '',
    "parentRelationship" TEXT NOT NULL DEFAULT 'GUARDIAN',
    "rating" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicCoScholasticFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademicCoScholasticActivity_institutionId_category_idx" ON "AcademicCoScholasticActivity"("institutionId", "category");

-- CreateIndex
CREATE INDEX "AcademicCoScholasticActivity_institutionId_teacherName_idx" ON "AcademicCoScholasticActivity"("institutionId", "teacherName");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicCoScholasticPerformance_institutionId_recordId_key" ON "AcademicCoScholasticPerformance"("institutionId", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicCoScholasticPerformance_institutionId_activityId_studentId_key" ON "AcademicCoScholasticPerformance"("institutionId", "activityId", "studentId");

-- CreateIndex
CREATE INDEX "AcademicCoScholasticPerformance_institutionId_studentId_idx" ON "AcademicCoScholasticPerformance"("institutionId", "studentId");

-- CreateIndex
CREATE INDEX "AcademicCoScholasticPerformance_institutionId_activityId_idx" ON "AcademicCoScholasticPerformance"("institutionId", "activityId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicCoScholasticFeedback_institutionId_recordId_key" ON "AcademicCoScholasticFeedback"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "AcademicCoScholasticFeedback_institutionId_activityId_idx" ON "AcademicCoScholasticFeedback"("institutionId", "activityId");

-- CreateIndex
CREATE INDEX "AcademicCoScholasticFeedback_institutionId_studentId_idx" ON "AcademicCoScholasticFeedback"("institutionId", "studentId");

-- AddForeignKey
ALTER TABLE "AcademicCoScholasticPerformance" ADD CONSTRAINT "AcademicCoScholasticPerformance_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicCoScholasticPerformance" ADD CONSTRAINT "AcademicCoScholasticPerformance_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "AcademicCoScholasticActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicCoScholasticFeedback" ADD CONSTRAINT "AcademicCoScholasticFeedback_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicCoScholasticFeedback" ADD CONSTRAINT "AcademicCoScholasticFeedback_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "AcademicCoScholasticActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
