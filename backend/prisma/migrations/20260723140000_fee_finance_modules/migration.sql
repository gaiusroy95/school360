-- CreateEnum
CREATE TYPE "FeeMasterStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "FeeInvoiceStatus" AS ENUM ('DRAFT', 'PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "FeeApprovalStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ACTIVE', 'EXPIRED', 'PROCESSED', 'CLOSED');
CREATE TYPE "FeeDiscountScope" AS ENUM ('NEW_ADMISSION', 'EXISTING_STUDENT', 'BOTH', 'ACCOUNT_SETTLEMENT');
CREATE TYPE "FeeRefundType" AS ENUM ('ADVANCE', 'DEPOSIT', 'OVERPAYMENT', 'OTHER');
CREATE TYPE "FeeFineCategory" AS ENUM ('LATE_FEE', 'LATE_EXAM_FEE', 'PROPERTY_DAMAGE', 'LAB_EQUIPMENT', 'LIBRARY_BOOK', 'COMPUTER_LAB', 'OTHER');
CREATE TYPE "FeeFineLevyStatus" AS ENUM ('PENDING', 'PAID', 'WAIVED', 'CANCELLED');
CREATE TYPE "TransportVendorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EMPANELLED');

-- CreateTable
CREATE TABLE "FeeMaster" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "defaultAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isRefundable" BOOLEAN NOT NULL DEFAULT false,
    "isTaxable" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "FeeMasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "showInCollection" BOOLEAN NOT NULL DEFAULT true,
    "showInInvoice" BOOLEAN NOT NULL DEFAULT true,
    "showInPayment" BOOLEAN NOT NULL DEFAULT true,
    "schoolDetails" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeeMaster_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeeInvoice" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "studentId" TEXT NOT NULL DEFAULT '',
    "admissionNumber" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL,
    "className" TEXT NOT NULL DEFAULT '',
    "sectionName" TEXT NOT NULL DEFAULT '',
    "rollNumber" TEXT NOT NULL DEFAULT '',
    "parentName" TEXT NOT NULL DEFAULT '',
    "parentMobile" TEXT NOT NULL DEFAULT '',
    "parentEmail" TEXT NOT NULL DEFAULT '',
    "photoUrl" TEXT NOT NULL DEFAULT '',
    "feePeriod" TEXT NOT NULL DEFAULT '',
    "invoiceDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATE,
    "status" "FeeInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMode" TEXT NOT NULL DEFAULT '',
    "lineItems" JSONB NOT NULL DEFAULT '[]',
    "totalFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "concessionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lateFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "previousDues" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPayable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remarks" TEXT NOT NULL DEFAULT '',
    "preparedBy" TEXT NOT NULL DEFAULT '',
    "verifiedBy" TEXT NOT NULL DEFAULT '',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "feeReceiptId" TEXT NOT NULL DEFAULT '',
    "institutionSnapshot" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeeInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeeDiscount" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scope" "FeeDiscountScope" NOT NULL DEFAULT 'NEW_ADMISSION',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "maxUses" INTEGER NOT NULL DEFAULT 0,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "FeeApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL DEFAULT '',
    "admissionNumber" TEXT NOT NULL DEFAULT '',
    "settlementAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requestedBy" TEXT NOT NULL DEFAULT '',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeeDiscount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeeRefund" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL DEFAULT '',
    "sectionName" TEXT NOT NULL DEFAULT '',
    "refundType" "FeeRefundType" NOT NULL DEFAULT 'ADVANCE',
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "status" "FeeApprovalStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "originalReceipt" TEXT NOT NULL DEFAULT '',
    "paymentMode" TEXT NOT NULL DEFAULT '',
    "requestedBy" TEXT NOT NULL DEFAULT '',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "rejectionReason" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeeRefund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeeFineType" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FeeFineCategory" NOT NULL DEFAULT 'OTHER',
    "defaultAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "isCustomizable" BOOLEAN NOT NULL DEFAULT true,
    "status" "FeeMasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeeFineType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeeFineLevy" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "fineTypeId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL DEFAULT '',
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "status" "FeeFineLevyStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" DATE,
    "collectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeeFineLevy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeeScholarship" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "waiverType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "waiverValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetAllocated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "applicableFor" TEXT NOT NULL DEFAULT 'BOTH',
    "status" "FeeApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "requestedBy" TEXT NOT NULL DEFAULT '',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeeScholarship_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeeScholarshipAward" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL DEFAULT '',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "FeeApprovalStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeeScholarshipAward_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportFeeVendor" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "vendorCode" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "routesCovered" TEXT NOT NULL DEFAULT '',
    "vehicleCount" INTEGER NOT NULL DEFAULT 0,
    "bankDetails" JSONB NOT NULL DEFAULT '{}',
    "status" "TransportVendorStatus" NOT NULL DEFAULT 'EMPANELLED',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportFeeVendor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportFeeCollection" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "monthLabel" TEXT NOT NULL DEFAULT '',
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL DEFAULT '',
    "routeName" TEXT NOT NULL DEFAULT '',
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMode" TEXT NOT NULL DEFAULT 'CASH',
    "collectedBy" TEXT NOT NULL DEFAULT '',
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportFeeCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportVendorPayment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMode" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    "paymentDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodLabel" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "paidBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportVendorPayment_pkey" PRIMARY KEY ("id")
);

-- Indexes & FKs
CREATE UNIQUE INDEX "FeeMaster_institutionId_code_key" ON "FeeMaster"("institutionId", "code");
CREATE INDEX "FeeMaster_institutionId_status_idx" ON "FeeMaster"("institutionId", "status");
CREATE INDEX "FeeMaster_institutionId_category_idx" ON "FeeMaster"("institutionId", "category");

CREATE UNIQUE INDEX "FeeInvoice_institutionId_invoiceNumber_key" ON "FeeInvoice"("institutionId", "invoiceNumber");
CREATE INDEX "FeeInvoice_institutionId_academicYear_status_idx" ON "FeeInvoice"("institutionId", "academicYear", "status");
CREATE INDEX "FeeInvoice_institutionId_admissionNumber_idx" ON "FeeInvoice"("institutionId", "admissionNumber");
CREATE INDEX "FeeInvoice_institutionId_studentId_idx" ON "FeeInvoice"("institutionId", "studentId");

CREATE UNIQUE INDEX "FeeDiscount_institutionId_code_key" ON "FeeDiscount"("institutionId", "code");
CREATE INDEX "FeeDiscount_institutionId_status_academicYear_idx" ON "FeeDiscount"("institutionId", "status", "academicYear");
CREATE INDEX "FeeDiscount_institutionId_scope_idx" ON "FeeDiscount"("institutionId", "scope");

CREATE UNIQUE INDEX "FeeRefund_institutionId_recordId_key" ON "FeeRefund"("institutionId", "recordId");
CREATE INDEX "FeeRefund_institutionId_status_academicYear_idx" ON "FeeRefund"("institutionId", "status", "academicYear");
CREATE INDEX "FeeRefund_institutionId_studentId_idx" ON "FeeRefund"("institutionId", "studentId");

CREATE UNIQUE INDEX "FeeFineType_institutionId_code_key" ON "FeeFineType"("institutionId", "code");
CREATE INDEX "FeeFineType_institutionId_category_status_idx" ON "FeeFineType"("institutionId", "category", "status");

CREATE INDEX "FeeFineLevy_institutionId_academicYear_status_idx" ON "FeeFineLevy"("institutionId", "academicYear", "status");
CREATE INDEX "FeeFineLevy_institutionId_studentId_idx" ON "FeeFineLevy"("institutionId", "studentId");
CREATE INDEX "FeeFineLevy_fineTypeId_idx" ON "FeeFineLevy"("fineTypeId");

CREATE UNIQUE INDEX "FeeScholarship_institutionId_code_academicYear_key" ON "FeeScholarship"("institutionId", "code", "academicYear");
CREATE INDEX "FeeScholarship_institutionId_status_academicYear_idx" ON "FeeScholarship"("institutionId", "status", "academicYear");

CREATE INDEX "FeeScholarshipAward_institutionId_academicYear_status_idx" ON "FeeScholarshipAward"("institutionId", "academicYear", "status");
CREATE INDEX "FeeScholarshipAward_scholarshipId_idx" ON "FeeScholarshipAward"("scholarshipId");
CREATE INDEX "FeeScholarshipAward_institutionId_studentId_idx" ON "FeeScholarshipAward"("institutionId", "studentId");

CREATE UNIQUE INDEX "TransportFeeVendor_institutionId_vendorCode_key" ON "TransportFeeVendor"("institutionId", "vendorCode");
CREATE INDEX "TransportFeeVendor_institutionId_status_idx" ON "TransportFeeVendor"("institutionId", "status");

CREATE UNIQUE INDEX "TransportFeeCollection_institutionId_receiptNumber_key" ON "TransportFeeCollection"("institutionId", "receiptNumber");
CREATE INDEX "TransportFeeCollection_institutionId_academicYear_idx" ON "TransportFeeCollection"("institutionId", "academicYear");
CREATE INDEX "TransportFeeCollection_institutionId_studentId_idx" ON "TransportFeeCollection"("institutionId", "studentId");

CREATE UNIQUE INDEX "TransportVendorPayment_institutionId_paymentNumber_key" ON "TransportVendorPayment"("institutionId", "paymentNumber");
CREATE INDEX "TransportVendorPayment_institutionId_vendorId_idx" ON "TransportVendorPayment"("institutionId", "vendorId");
CREATE INDEX "TransportVendorPayment_institutionId_paymentDate_idx" ON "TransportVendorPayment"("institutionId", "paymentDate");

ALTER TABLE "FeeMaster" ADD CONSTRAINT "FeeMaster_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeeInvoice" ADD CONSTRAINT "FeeInvoice_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeeDiscount" ADD CONSTRAINT "FeeDiscount_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeeRefund" ADD CONSTRAINT "FeeRefund_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeeFineType" ADD CONSTRAINT "FeeFineType_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeeFineLevy" ADD CONSTRAINT "FeeFineLevy_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeeFineLevy" ADD CONSTRAINT "FeeFineLevy_fineTypeId_fkey" FOREIGN KEY ("fineTypeId") REFERENCES "FeeFineType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeeScholarship" ADD CONSTRAINT "FeeScholarship_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeeScholarshipAward" ADD CONSTRAINT "FeeScholarshipAward_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeeScholarshipAward" ADD CONSTRAINT "FeeScholarshipAward_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "FeeScholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFeeVendor" ADD CONSTRAINT "TransportFeeVendor_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportFeeCollection" ADD CONSTRAINT "TransportFeeCollection_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportVendorPayment" ADD CONSTRAINT "TransportVendorPayment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportVendorPayment" ADD CONSTRAINT "TransportVendorPayment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "TransportFeeVendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
