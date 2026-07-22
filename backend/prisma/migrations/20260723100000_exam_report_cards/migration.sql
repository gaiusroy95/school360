-- CreateEnum
CREATE TYPE "ExamReportCardTemplate" AS ENUM ('PRE_PRIMARY', 'PRIMARY', 'MIDDLE', 'UPPER', 'BOARD');

-- CreateEnum
CREATE TYPE "ExamReportCardStatus" AS ENUM ('PENDING', 'GENERATED', 'PUBLISHED', 'SHARED');

-- AlterTable
ALTER TABLE "ExamStudentResult" ADD COLUMN "reportCardStatus" "ExamReportCardStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "ExamStudentResult" ADD COLUMN "templateType" "ExamReportCardTemplate" NOT NULL DEFAULT 'PRIMARY';
ALTER TABLE "ExamStudentResult" ADD COLUMN "generatedAt" TIMESTAMP(3);
ALTER TABLE "ExamStudentResult" ADD COLUMN "reportCardPublishedAt" TIMESTAMP(3);
ALTER TABLE "ExamStudentResult" ADD COLUMN "reportCardSharedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ExamReportCardConfig" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "schoolName" TEXT NOT NULL DEFAULT '',
    "schoolAddress" TEXT NOT NULL DEFAULT '',
    "principalName" TEXT NOT NULL DEFAULT '',
    "principalSignatureData" TEXT NOT NULL DEFAULT '',
    "schoolSealData" TEXT NOT NULL DEFAULT '',
    "classTeacherSignatureData" TEXT NOT NULL DEFAULT '',
    "headerLogoData" TEXT NOT NULL DEFAULT '',
    "footerNote" TEXT NOT NULL DEFAULT 'This is a computer-generated report card.',
    "boardExamNotice" TEXT NOT NULL DEFAULT 'Marksheet for this class is issued by the Board of Education as per government rules.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamReportCardConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamBoardMarksheetUpload" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "examinationName" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "fileData" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL DEFAULT '',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamBoardMarksheetUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamReportCardConfig_institutionId_academicYear_key" ON "ExamReportCardConfig"("institutionId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "ExamBoardMarksheetUpload_institutionId_studentId_academicYear_examinationName_key" ON "ExamBoardMarksheetUpload"("institutionId", "studentId", "academicYear", "examinationName");

-- CreateIndex
CREATE INDEX "ExamBoardMarksheetUpload_institutionId_className_sectionName_idx" ON "ExamBoardMarksheetUpload"("institutionId", "className", "sectionName");

-- CreateIndex
CREATE INDEX "ExamStudentResult_institutionId_reportCardStatus_idx" ON "ExamStudentResult"("institutionId", "reportCardStatus");

-- AddForeignKey
ALTER TABLE "ExamReportCardConfig" ADD CONSTRAINT "ExamReportCardConfig_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamBoardMarksheetUpload" ADD CONSTRAINT "ExamBoardMarksheetUpload_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamBoardMarksheetUpload" ADD CONSTRAINT "ExamBoardMarksheetUpload_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
