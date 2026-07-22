-- CreateEnum
CREATE TYPE "ExamCertificateCategory" AS ENUM ('PHYSICAL_HEALTH', 'WORK_EDUCATION', 'VISUAL_PERFORMING_ARTS', 'LEADERSHIP_COMMUNITY');

-- CreateEnum
CREATE TYPE "ExamCertificateStatus" AS ENUM ('RECORDED', 'GENERATED', 'ISSUED');

-- CreateTable
CREATE TABLE "ExamCertificateConfig" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "schoolName" TEXT NOT NULL DEFAULT '',
    "schoolAddress" TEXT NOT NULL DEFAULT '',
    "principalName" TEXT NOT NULL DEFAULT '',
    "principalSignatureData" TEXT NOT NULL DEFAULT '',
    "schoolSealData" TEXT NOT NULL DEFAULT '',
    "headerLogoData" TEXT NOT NULL DEFAULT '',
    "footerNote" TEXT NOT NULL DEFAULT 'This certificate is issued by the school authority.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamCertificateConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamCoScholasticCertificate" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "term" TEXT NOT NULL DEFAULT 'Annual',
    "studentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "category" "ExamCertificateCategory" NOT NULL,
    "subCategory" TEXT NOT NULL DEFAULT '',
    "activityTitle" TEXT NOT NULL,
    "activityId" TEXT,
    "performanceId" TEXT,
    "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performanceGrade" TEXT NOT NULL DEFAULT '',
    "performanceBand" TEXT NOT NULL DEFAULT '',
    "status" "ExamCertificateStatus" NOT NULL DEFAULT 'RECORDED',
    "certificateToken" TEXT NOT NULL,
    "recordedBy" TEXT NOT NULL DEFAULT '',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamCoScholasticCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamCertificateConfig_institutionId_academicYear_key" ON "ExamCertificateConfig"("institutionId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "ExamCoScholasticCertificate_institutionId_recordId_key" ON "ExamCoScholasticCertificate"("institutionId", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamCoScholasticCertificate_certificateToken_key" ON "ExamCoScholasticCertificate"("certificateToken");

-- CreateIndex
CREATE UNIQUE INDEX "ExamCoScholasticCertificate_institutionId_studentId_activityId_category_key" ON "ExamCoScholasticCertificate"("institutionId", "studentId", "activityId", "category");

-- CreateIndex
CREATE INDEX "ExamCoScholasticCertificate_institutionId_academicYear_status_idx" ON "ExamCoScholasticCertificate"("institutionId", "academicYear", "status");

-- CreateIndex
CREATE INDEX "ExamCoScholasticCertificate_institutionId_className_sectionName_idx" ON "ExamCoScholasticCertificate"("institutionId", "className", "sectionName");

-- CreateIndex
CREATE INDEX "ExamCoScholasticCertificate_institutionId_category_idx" ON "ExamCoScholasticCertificate"("institutionId", "category");

-- AddForeignKey
ALTER TABLE "ExamCertificateConfig" ADD CONSTRAINT "ExamCertificateConfig_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamCoScholasticCertificate" ADD CONSTRAINT "ExamCoScholasticCertificate_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamCoScholasticCertificate" ADD CONSTRAINT "ExamCoScholasticCertificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
