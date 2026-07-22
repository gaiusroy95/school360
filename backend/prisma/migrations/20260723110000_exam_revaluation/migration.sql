-- CreateEnum
CREATE TYPE "ExamRevaluationRequestType" AS ENUM ('REVALUATION', 'RECHECK');

-- CreateEnum
CREATE TYPE "ExamRevaluationStatus" AS ENUM ('RECEIVED', 'FEE_PENDING', 'FEE_PAID', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ExamBackPaperStatus" AS ENUM ('CREATED', 'MARKS_ENTRY', 'COMPLETED', 'PUBLISHED');

-- CreateTable
CREATE TABLE "ExamRevaluationConfig" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "revaluationFee" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "recheckFee" DOUBLE PRECISION NOT NULL DEFAULT 300,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 30,
    "passingPercent" DOUBLE PRECISION NOT NULL DEFAULT 36,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamRevaluationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamRevaluationRequest" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "examinationName" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentResultId" TEXT,
    "batchId" TEXT,
    "studentName" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "requestType" "ExamRevaluationRequestType" NOT NULL,
    "status" "ExamRevaluationStatus" NOT NULL DEFAULT 'RECEIVED',
    "originalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "originalMaxMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "originalGrade" TEXT NOT NULL DEFAULT '',
    "revisedMarks" DOUBLE PRECISION,
    "revisedMaxMarks" DOUBLE PRECISION,
    "revisedGrade" TEXT NOT NULL DEFAULT '',
    "feeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feePaid" BOOLEAN NOT NULL DEFAULT false,
    "feeReceiptNumber" TEXT NOT NULL DEFAULT '',
    "feePaymentMode" TEXT NOT NULL DEFAULT '',
    "feePaidAt" TIMESTAMP(3),
    "gracePeriodEndsAt" TIMESTAMP(3) NOT NULL,
    "resultPublishedAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedBy" TEXT NOT NULL DEFAULT '',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT NOT NULL DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "rejectionReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamRevaluationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamBackPaperExam" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "examinationName" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentResultId" TEXT,
    "studentName" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "status" "ExamBackPaperStatus" NOT NULL DEFAULT 'CREATED',
    "originalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "originalMaxMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "originalGrade" TEXT NOT NULL DEFAULT '',
    "passingMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "examDate" TIMESTAMP(3),
    "newMarks" DOUBLE PRECISION,
    "newMaxMarks" DOUBLE PRECISION,
    "newGrade" TEXT NOT NULL DEFAULT '',
    "marksEnteredAt" TIMESTAMP(3),
    "marksEnteredBy" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamBackPaperExam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamRevaluationConfig_institutionId_academicYear_key" ON "ExamRevaluationConfig"("institutionId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "ExamRevaluationRequest_institutionId_recordId_key" ON "ExamRevaluationRequest"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "ExamRevaluationRequest_institutionId_academicYear_status_idx" ON "ExamRevaluationRequest"("institutionId", "academicYear", "status");

-- CreateIndex
CREATE INDEX "ExamRevaluationRequest_institutionId_studentId_idx" ON "ExamRevaluationRequest"("institutionId", "studentId");

-- CreateIndex
CREATE INDEX "ExamRevaluationRequest_institutionId_className_sectionName_idx" ON "ExamRevaluationRequest"("institutionId", "className", "sectionName");

-- CreateIndex
CREATE UNIQUE INDEX "ExamBackPaperExam_institutionId_recordId_key" ON "ExamBackPaperExam"("institutionId", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamBackPaperExam_institutionId_academicYear_studentId_subjectName_examinationName_key" ON "ExamBackPaperExam"("institutionId", "academicYear", "studentId", "subjectName", "examinationName");

-- CreateIndex
CREATE INDEX "ExamBackPaperExam_institutionId_academicYear_status_idx" ON "ExamBackPaperExam"("institutionId", "academicYear", "status");

-- CreateIndex
CREATE INDEX "ExamBackPaperExam_institutionId_className_sectionName_idx" ON "ExamBackPaperExam"("institutionId", "className", "sectionName");

-- AddForeignKey
ALTER TABLE "ExamRevaluationConfig" ADD CONSTRAINT "ExamRevaluationConfig_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRevaluationRequest" ADD CONSTRAINT "ExamRevaluationRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRevaluationRequest" ADD CONSTRAINT "ExamRevaluationRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamBackPaperExam" ADD CONSTRAINT "ExamBackPaperExam_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamBackPaperExam" ADD CONSTRAINT "ExamBackPaperExam_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
