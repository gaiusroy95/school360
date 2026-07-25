-- Transport Fee Management module

CREATE TABLE IF NOT EXISTS "TransportFeeStructure" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "structureCode" TEXT NOT NULL,
  "structureName" TEXT NOT NULL,
  "pricingType" TEXT NOT NULL DEFAULT 'ROUTE',
  "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
  "academicYear" TEXT NOT NULL DEFAULT '2025-26',
  "branch" TEXT NOT NULL DEFAULT 'Main Campus',
  "routeId" TEXT,
  "stopName" TEXT NOT NULL DEFAULT '',
  "zoneName" TEXT NOT NULL DEFAULT '',
  "distanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "perKmRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "vehicleCategory" TEXT NOT NULL DEFAULT 'Non-AC',
  "studentCategory" TEXT NOT NULL DEFAULT 'Day Scholar',
  "className" TEXT NOT NULL DEFAULT '',
  "baseAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "gstPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "versionLabel" TEXT NOT NULL DEFAULT 'v1',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportFeeStructure_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TransportFeeStructure_institutionId_structureCode_key"
  ON "TransportFeeStructure"("institutionId", "structureCode");
CREATE INDEX IF NOT EXISTS "TransportFeeStructure_institutionId_academicYear_status_idx"
  ON "TransportFeeStructure"("institutionId", "academicYear", "status");

CREATE TABLE IF NOT EXISTS "TransportFeeStructureRevision" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "structureId" TEXT NOT NULL,
  "previousAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "newAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reason" TEXT NOT NULL DEFAULT '',
  "revisedBy" TEXT NOT NULL DEFAULT 'Transport Manager',
  "revisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TransportFeeStructureRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransportFeeStudentAssignment" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "structureId" TEXT NOT NULL,
  "academicYear" TEXT NOT NULL DEFAULT '2025-26',
  "assignedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "concessionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "siblingDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "staffChildDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "scholarshipWaiver" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "depositPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "depositRefunded" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "overrideReason" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "effectiveFrom" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportFeeStudentAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TransportFeeStudentAssignment_enrollmentId_structureId_academicYear_key"
  ON "TransportFeeStudentAssignment"("enrollmentId", "structureId", "academicYear");

CREATE TABLE IF NOT EXISTS "TransportFeeInvoice" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "assignmentId" TEXT,
  "academicYear" TEXT NOT NULL DEFAULT '2025-26',
  "periodLabel" TEXT NOT NULL DEFAULT '',
  "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
  "studentName" TEXT NOT NULL,
  "className" TEXT NOT NULL DEFAULT '',
  "routeName" TEXT NOT NULL DEFAULT '',
  "grossAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "concessionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "penaltyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "balanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "dueDate" DATE NOT NULL,
  "gracePeriodDays" INTEGER NOT NULL DEFAULT 7,
  "status" TEXT NOT NULL DEFAULT 'ISSUED',
  "isProforma" BOOLEAN NOT NULL DEFAULT false,
  "journalPosted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportFeeInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TransportFeeInvoice_institutionId_invoiceNumber_key"
  ON "TransportFeeInvoice"("institutionId", "invoiceNumber");
CREATE INDEX IF NOT EXISTS "TransportFeeInvoice_institutionId_academicYear_status_idx"
  ON "TransportFeeInvoice"("institutionId", "academicYear", "status");

CREATE TABLE IF NOT EXISTS "TransportFeePayment" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "receiptNumber" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paymentMode" TEXT NOT NULL DEFAULT 'CASH',
  "gatewayRef" TEXT NOT NULL DEFAULT '',
  "qrPayment" BOOLEAN NOT NULL DEFAULT false,
  "isPartial" BOOLEAN NOT NULL DEFAULT false,
  "isAdvance" BOOLEAN NOT NULL DEFAULT false,
  "collectedBy" TEXT NOT NULL DEFAULT 'Accounts',
  "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "remarks" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TransportFeePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TransportFeePayment_institutionId_receiptNumber_key"
  ON "TransportFeePayment"("institutionId", "receiptNumber");

CREATE TABLE IF NOT EXISTS "TransportFeeRefund" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "invoiceId" TEXT,
  "refundNumber" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL DEFAULT '',
  "studentName" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reason" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "approvedBy" TEXT NOT NULL DEFAULT '',
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportFeeRefund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TransportFeeRefund_institutionId_refundNumber_key"
  ON "TransportFeeRefund"("institutionId", "refundNumber");

CREATE TABLE IF NOT EXISTS "TransportFeePenalty" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "penaltyType" TEXT NOT NULL DEFAULT 'LATE_FEE',
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "waived" BOOLEAN NOT NULL DEFAULT false,
  "waiverReason" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TransportFeePenalty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransportFeeSettings" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "gracePeriodDays" INTEGER NOT NULL DEFAULT 7,
  "lateFeePerDay" DOUBLE PRECISION NOT NULL DEFAULT 50,
  "lateFeeCap" DOUBLE PRECISION NOT NULL DEFAULT 500,
  "autoSuspendDays" INTEGER NOT NULL DEFAULT 60,
  "siblingDiscountPct" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "staffChildDiscountPct" DOUBLE PRECISION NOT NULL DEFAULT 25,
  "roleMatrix" JSONB NOT NULL DEFAULT '[]',
  "notificationRules" JSONB NOT NULL DEFAULT '{}',
  "mobileSyncRules" JSONB NOT NULL DEFAULT '{}',
  "reportCatalog" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportFeeSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TransportFeeSettings_institutionId_key"
  ON "TransportFeeSettings"("institutionId");

CREATE TABLE IF NOT EXISTS "TransportFeeAuditLog" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL DEFAULT '',
  "action" TEXT NOT NULL,
  "details" TEXT NOT NULL DEFAULT '',
  "performedBy" TEXT NOT NULL DEFAULT 'Accounts',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TransportFeeAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TransportFeeAuditLog_institutionId_createdAt_idx"
  ON "TransportFeeAuditLog"("institutionId", "createdAt");

ALTER TABLE "TransportFeeStructure" ADD CONSTRAINT "TransportFeeStructure_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFeeStructure" ADD CONSTRAINT "TransportFeeStructure_routeId_fkey"
  FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportFeeStructureRevision" ADD CONSTRAINT "TransportFeeStructureRevision_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFeeStructureRevision" ADD CONSTRAINT "TransportFeeStructureRevision_structureId_fkey"
  FOREIGN KEY ("structureId") REFERENCES "TransportFeeStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFeeStudentAssignment" ADD CONSTRAINT "TransportFeeStudentAssignment_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFeeStudentAssignment" ADD CONSTRAINT "TransportFeeStudentAssignment_enrollmentId_fkey"
  FOREIGN KEY ("enrollmentId") REFERENCES "TransportStudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFeeStudentAssignment" ADD CONSTRAINT "TransportFeeStudentAssignment_structureId_fkey"
  FOREIGN KEY ("structureId") REFERENCES "TransportFeeStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFeeInvoice" ADD CONSTRAINT "TransportFeeInvoice_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFeeInvoice" ADD CONSTRAINT "TransportFeeInvoice_enrollmentId_fkey"
  FOREIGN KEY ("enrollmentId") REFERENCES "TransportStudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFeeInvoice" ADD CONSTRAINT "TransportFeeInvoice_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "TransportFeeStudentAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportFeePayment" ADD CONSTRAINT "TransportFeePayment_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFeePayment" ADD CONSTRAINT "TransportFeePayment_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "TransportFeeInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFeeRefund" ADD CONSTRAINT "TransportFeeRefund_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFeeRefund" ADD CONSTRAINT "TransportFeeRefund_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "TransportFeeInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportFeePenalty" ADD CONSTRAINT "TransportFeePenalty_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFeePenalty" ADD CONSTRAINT "TransportFeePenalty_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "TransportFeeInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFeeSettings" ADD CONSTRAINT "TransportFeeSettings_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFeeAuditLog" ADD CONSTRAINT "TransportFeeAuditLog_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
