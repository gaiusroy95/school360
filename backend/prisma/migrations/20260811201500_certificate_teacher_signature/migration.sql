-- AlterTable
ALTER TABLE "ExamCertificateConfig" ADD COLUMN IF NOT EXISTS "classTeacherSignatureData" TEXT NOT NULL DEFAULT '';
