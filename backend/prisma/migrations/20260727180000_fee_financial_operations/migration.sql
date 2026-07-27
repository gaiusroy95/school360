-- Fee Management & Financial Operations

CREATE TABLE "fee_groups" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "groupCode" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fee_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fee_types" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "glAccount" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "isRefundable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fee_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fee_installments" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "installmentCount" INTEGER NOT NULL DEFAULT 4,
    "scheduleType" TEXT NOT NULL DEFAULT 'Quarterly',
    "scheduleJson" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fee_installments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fee_concessions" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "allowConcessions" BOOLEAN NOT NULL DEFAULT true,
    "maxDiscountPercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "approvalLevel" TEXT NOT NULL DEFAULT 'Principal',
    "discountRules" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fee_concessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "late_fee_rules" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "graceDays" INTEGER NOT NULL DEFAULT 5,
    "fineType" TEXT NOT NULL DEFAULT 'flat',
    "fineAmount" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "finePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "late_fee_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "methodCode" TEXT NOT NULL,
    "methodName" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "accountParams" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fee_online_payment_settings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'Razorpay',
    "apiKeyMasked" TEXT NOT NULL DEFAULT '',
    "apiSecretStored" TEXT NOT NULL DEFAULT '',
    "webhookUrl" TEXT NOT NULL DEFAULT '',
    "webhookSecretStored" TEXT NOT NULL DEFAULT '',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "testMode" BOOLEAN NOT NULL DEFAULT true,
    "lastTestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fee_online_payment_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fee_refund_policies" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "requireApproval" BOOLEAN NOT NULL DEFAULT true,
    "approvalLevels" JSONB NOT NULL DEFAULT '["Accounts","Principal"]',
    "autoCreditLedger" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fee_refund_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fee_payment_reminders" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "channels" JSONB NOT NULL DEFAULT '["Email","SMS"]',
    "daysBeforeDue" JSONB NOT NULL DEFAULT '[7,3,1]',
    "daysAfterDue" JSONB NOT NULL DEFAULT '[1,7,15]',
    "cronSchedule" TEXT NOT NULL DEFAULT '0 9 * * *',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fee_payment_reminders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fee_financial_audit_logs" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "userEmail" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fee_financial_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fee_groups_institutionId_academicYear_groupCode_key" ON "fee_groups"("institutionId", "academicYear", "groupCode");
CREATE UNIQUE INDEX "fee_types_institutionId_code_key" ON "fee_types"("institutionId", "code");
CREATE UNIQUE INDEX "fee_installments_institutionId_academicYear_key" ON "fee_installments"("institutionId", "academicYear");
CREATE UNIQUE INDEX "fee_concessions_institutionId_academicYear_key" ON "fee_concessions"("institutionId", "academicYear");
CREATE UNIQUE INDEX "late_fee_rules_institutionId_academicYear_key" ON "late_fee_rules"("institutionId", "academicYear");
CREATE UNIQUE INDEX "payment_methods_institutionId_methodCode_key" ON "payment_methods"("institutionId", "methodCode");
CREATE UNIQUE INDEX "fee_online_payment_settings_institutionId_key" ON "fee_online_payment_settings"("institutionId");
CREATE UNIQUE INDEX "fee_refund_policies_institutionId_academicYear_key" ON "fee_refund_policies"("institutionId", "academicYear");
CREATE UNIQUE INDEX "fee_payment_reminders_institutionId_academicYear_key" ON "fee_payment_reminders"("institutionId", "academicYear");
CREATE INDEX "fee_financial_audit_logs_institutionId_category_idx" ON "fee_financial_audit_logs"("institutionId", "category");

ALTER TABLE "fee_groups" ADD CONSTRAINT "fee_groups_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fee_types" ADD CONSTRAINT "fee_types_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fee_installments" ADD CONSTRAINT "fee_installments_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fee_concessions" ADD CONSTRAINT "fee_concessions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "late_fee_rules" ADD CONSTRAINT "late_fee_rules_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fee_online_payment_settings" ADD CONSTRAINT "fee_online_payment_settings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fee_refund_policies" ADD CONSTRAINT "fee_refund_policies_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fee_payment_reminders" ADD CONSTRAINT "fee_payment_reminders_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fee_financial_audit_logs" ADD CONSTRAINT "fee_financial_audit_logs_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
