-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApplicationDocumentType" AS ENUM ('BIRTH_CERTIFICATE', 'PREVIOUS_MARKSHEET', 'ADDRESS_PROOF', 'OTHER');

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "enquiryId" TEXT,
    "applicationId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedBy" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL,
    "dateOfBirth" DATE,
    "fatherName" TEXT NOT NULL DEFAULT '',
    "motherName" TEXT NOT NULL DEFAULT '',
    "placeOfBirth" TEXT NOT NULL DEFAULT '',
    "classApplied" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "entranceTestScore" DOUBLE PRECISION,
    "entranceTestMax" DOUBLE PRECISION DEFAULT 100,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvalRemarks" TEXT,
    "rejectionRemarks" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "ApplicationDocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "fileData" TEXT NOT NULL,
    "extractedFields" JSONB NOT NULL DEFAULT '{}',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Application_institutionId_applicationId_key" ON "Application"("institutionId", "applicationId");

-- CreateIndex
CREATE INDEX "Application_institutionId_status_idx" ON "Application"("institutionId", "status");

-- CreateIndex
CREATE INDEX "Application_institutionId_submittedAt_idx" ON "Application"("institutionId", "submittedAt");

-- CreateIndex
CREATE INDEX "Application_enquiryId_idx" ON "Application"("enquiryId");

-- CreateIndex
CREATE INDEX "ApplicationDocument_applicationId_type_idx" ON "ApplicationDocument"("applicationId", "type");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
