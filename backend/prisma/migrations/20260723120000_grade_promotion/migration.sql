-- CreateEnum
CREATE TYPE "StudentPromotionType" AS ENUM ('PROMOTED', 'PASSED_OUT', 'RETAINED', 'DETAINED');

-- CreateTable
CREATE TABLE "StudentSessionHistory" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "batchId" TEXT,
    "promotionBatchId" TEXT,
    "fromAcademicYear" TEXT NOT NULL,
    "toAcademicYear" TEXT NOT NULL,
    "fromClassName" TEXT NOT NULL,
    "fromSectionName" TEXT NOT NULL,
    "toClassName" TEXT NOT NULL,
    "toSectionName" TEXT NOT NULL,
    "promotionType" "StudentPromotionType" NOT NULL DEFAULT 'PROMOTED',
    "finalPercentage" DOUBLE PRECISION,
    "finalGrade" TEXT NOT NULL DEFAULT '',
    "resultSnapshot" JSONB NOT NULL DEFAULT '{}',
    "parentSnapshot" JSONB NOT NULL DEFAULT '{}',
    "remarks" TEXT NOT NULL DEFAULT '',
    "promotedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promotedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentSessionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamGradePromotionBatch" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "fromAcademicYear" TEXT NOT NULL,
    "toAcademicYear" TEXT NOT NULL,
    "fromClassName" TEXT NOT NULL,
    "fromSectionName" TEXT NOT NULL,
    "toClassName" TEXT NOT NULL,
    "toSectionName" TEXT NOT NULL,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "promotedBy" TEXT NOT NULL DEFAULT '',
    "promotedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ExamGradePromotionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentSessionHistory_institutionId_studentId_idx" ON "StudentSessionHistory"("institutionId", "studentId");

-- CreateIndex
CREATE INDEX "StudentSessionHistory_institutionId_fromAcademicYear_idx" ON "StudentSessionHistory"("institutionId", "fromAcademicYear");

-- CreateIndex
CREATE INDEX "StudentSessionHistory_promotionBatchId_idx" ON "StudentSessionHistory"("promotionBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamGradePromotionBatch_institutionId_recordId_key" ON "ExamGradePromotionBatch"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "ExamGradePromotionBatch_institutionId_fromAcademicYear_toAcademicYear_idx" ON "ExamGradePromotionBatch"("institutionId", "fromAcademicYear", "toAcademicYear");

-- AddForeignKey
ALTER TABLE "StudentSessionHistory" ADD CONSTRAINT "StudentSessionHistory_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSessionHistory" ADD CONSTRAINT "StudentSessionHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSessionHistory" ADD CONSTRAINT "StudentSessionHistory_promotionBatchId_fkey" FOREIGN KEY ("promotionBatchId") REFERENCES "ExamGradePromotionBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamGradePromotionBatch" ADD CONSTRAINT "ExamGradePromotionBatch_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
