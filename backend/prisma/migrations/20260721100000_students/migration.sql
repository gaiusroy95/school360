-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PASSOUT', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "StudentGender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "admissionRecordId" TEXT,
    "admissionNumber" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL DEFAULT '',
    "rfidTag" TEXT NOT NULL DEFAULT '',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL DEFAULT '',
    "dateOfBirth" DATE,
    "gender" "StudentGender" NOT NULL DEFAULT 'OTHER',
    "bloodGroup" TEXT NOT NULL DEFAULT '',
    "aadhaarNumber" TEXT NOT NULL DEFAULT '',
    "religion" TEXT NOT NULL DEFAULT '',
    "nationality" TEXT NOT NULL DEFAULT 'Indian',
    "category" TEXT NOT NULL DEFAULT 'General',
    "placeOfBirth" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "photoUrl" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "house" TEXT NOT NULL DEFAULT '',
    "fatherName" TEXT NOT NULL DEFAULT '',
    "fatherMobile" TEXT NOT NULL DEFAULT '',
    "motherName" TEXT NOT NULL DEFAULT '',
    "motherMobile" TEXT NOT NULL DEFAULT '',
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "leftReason" TEXT NOT NULL DEFAULT '',
    "documents" JSONB NOT NULL DEFAULT '{}',
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "entranceScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_admissionRecordId_key" ON "Student"("admissionRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_institutionId_admissionNumber_key" ON "Student"("institutionId", "admissionNumber");

-- CreateIndex
CREATE INDEX "Student_institutionId_academicYear_status_idx" ON "Student"("institutionId", "academicYear", "status");

-- CreateIndex
CREATE INDEX "Student_institutionId_className_sectionName_idx" ON "Student"("institutionId", "className", "sectionName");

-- CreateIndex
CREATE INDEX "Student_institutionId_gender_idx" ON "Student"("institutionId", "gender");

-- CreateIndex
CREATE INDEX "Student_institutionId_category_idx" ON "Student"("institutionId", "category");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_admissionRecordId_fkey" FOREIGN KEY ("admissionRecordId") REFERENCES "AdmissionRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
