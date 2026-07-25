-- Message Templates: gateway compliance + variables

ALTER TABLE "CommMessageTemplate" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'TRANSACTIONAL';
ALTER TABLE "CommMessageTemplate" ADD COLUMN "headerText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommMessageTemplate" ADD COLUMN "footerText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommMessageTemplate" ADD COLUMN "gatewayStatus" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "CommMessageTemplate" ADD COLUMN "gatewayProvider" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommMessageTemplate" ADD COLUMN "gatewayTemplateId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommMessageTemplate" ADD COLUMN "dltEntityId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommMessageTemplate" ADD COLUMN "dltHeaderId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommMessageTemplate" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "CommMessageTemplate" ADD COLUMN "rejectionReason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CommMessageTemplate" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "CommMessageTemplate" ADD COLUMN "gatewayApprovedAt" TIMESTAMP(3);
ALTER TABLE "CommMessageTemplate" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CommMessageTemplate" ADD COLUMN "createdBy" TEXT NOT NULL DEFAULT '';

-- Existing seeded templates were auto-active; mark approved for compose continuity
UPDATE "CommMessageTemplate" SET "gatewayStatus" = 'APPROVED', "gatewayApprovedAt" = NOW() WHERE "isActive" = true;

CREATE INDEX "CommMessageTemplate_institutionId_gatewayStatus_idx" ON "CommMessageTemplate"("institutionId", "gatewayStatus");
CREATE INDEX "CommMessageTemplate_institutionId_category_idx" ON "CommMessageTemplate"("institutionId", "category");

CREATE TABLE "CommTemplateVariable" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "variableKey" TEXT NOT NULL,
    "variableLabel" TEXT NOT NULL,
    "placeholder" TEXT NOT NULL DEFAULT '',
    "sampleValue" TEXT NOT NULL DEFAULT '',
    "isLocked" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommTemplateVariable_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommTemplateVariable_templateId_variableKey_key" ON "CommTemplateVariable"("templateId", "variableKey");
CREATE INDEX "CommTemplateVariable_institutionId_templateId_idx" ON "CommTemplateVariable"("institutionId", "templateId");

ALTER TABLE "CommTemplateVariable" ADD CONSTRAINT "CommTemplateVariable_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommTemplateVariable" ADD CONSTRAINT "CommTemplateVariable_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CommMessageTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
