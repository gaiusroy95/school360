-- AlterEnum
ALTER TYPE "TransportVendorStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
ALTER TYPE "TransportVendorStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "TransportVendorStatus" ADD VALUE IF NOT EXISTS 'RED_CATEGORY';

-- AlterTable TransportFeeVendor
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "ownerPan" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "ownerAadhaar" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "driver1Name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "driver1Mobile" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "driver1DlNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "driver1DlExpiry" DATE;
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "driver1PoliceVerification" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "driver2Name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "driver2Mobile" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "driver2DlNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "driver2DlExpiry" DATE;
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "driver2PoliceVerification" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "vehicleRegNo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "vehicleChassisNo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "vehicleType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "pollutionCertDate" DATE;
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "pollutionExpiryDate" DATE;
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "insurancePolicyNo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "insuranceExpiryDate" DATE;
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "trackingGpsDeviceId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "trackingPhoneAccess" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "documents" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "complianceCategory" TEXT NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "pendingApproverRole" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "pendingApproverName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "pendingApproverEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "requestedBy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "TransportFeeVendor" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "TransportFeeVendor_institutionId_complianceCategory_idx" ON "TransportFeeVendor"("institutionId", "complianceCategory");

-- AlterTable TransportFeeCollection
ALTER TABLE "TransportFeeCollection" ADD COLUMN IF NOT EXISTS "sectionName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportFeeCollection" ADD COLUMN IF NOT EXISTS "totalDueFees" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TransportVendorComplianceAlert" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL DEFAULT 'RENEWAL_REMINDER',
    "title" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "recipientRole" TEXT NOT NULL DEFAULT 'PRINCIPAL',
    "recipientName" TEXT NOT NULL DEFAULT '',
    "recipientEmail" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransportVendorComplianceAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TransportVendorComplianceAlert_institutionId_status_createdAt_idx"
  ON "TransportVendorComplianceAlert"("institutionId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "TransportVendorComplianceAlert_vendorId_alertType_idx"
  ON "TransportVendorComplianceAlert"("vendorId", "alertType");

DO $$ BEGIN
  ALTER TABLE "TransportVendorComplianceAlert"
    ADD CONSTRAINT "TransportVendorComplianceAlert_institutionId_fkey"
    FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TransportVendorComplianceAlert"
    ADD CONSTRAINT "TransportVendorComplianceAlert_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "TransportFeeVendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
