-- HR Allowances & Deductions master components
CREATE TABLE IF NOT EXISTS "HrSalaryComponentGroup" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrSalaryComponentGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrSalaryComponent" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "groupId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "calculationType" TEXT NOT NULL DEFAULT 'FIXED',
    "formula" TEXT NOT NULL DEFAULT '',
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fixedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "taxability" TEXT NOT NULL DEFAULT 'TAXABLE',
    "pfApplicable" BOOLEAN NOT NULL DEFAULT false,
    "esiApplicable" BOOLEAN NOT NULL DEFAULT false,
    "gratuity" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT NOT NULL DEFAULT '',
    "advancedSettings" JSONB NOT NULL DEFAULT '{}',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "updatedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrSalaryComponent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrSalaryComponentMapping" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "templateId" TEXT,
    "payGrade" TEXT NOT NULL DEFAULT '',
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrSalaryComponentMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HrSalaryComponentHistory" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL DEFAULT 'system',
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrSalaryComponentHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HrSalaryComponentGroup_institutionId_code_key" ON "HrSalaryComponentGroup"("institutionId", "code");
CREATE INDEX IF NOT EXISTS "HrSalaryComponentGroup_institutionId_status_idx" ON "HrSalaryComponentGroup"("institutionId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "HrSalaryComponent_institutionId_code_key" ON "HrSalaryComponent"("institutionId", "code");
CREATE INDEX IF NOT EXISTS "HrSalaryComponent_institutionId_componentType_status_idx" ON "HrSalaryComponent"("institutionId", "componentType", "status");
CREATE INDEX IF NOT EXISTS "HrSalaryComponent_institutionId_groupId_idx" ON "HrSalaryComponent"("institutionId", "groupId");

CREATE INDEX IF NOT EXISTS "HrSalaryComponentMapping_institutionId_componentId_idx" ON "HrSalaryComponentMapping"("institutionId", "componentId");
CREATE INDEX IF NOT EXISTS "HrSalaryComponentMapping_templateId_idx" ON "HrSalaryComponentMapping"("templateId");

CREATE INDEX IF NOT EXISTS "HrSalaryComponentHistory_componentId_createdAt_idx" ON "HrSalaryComponentHistory"("componentId", "createdAt");

ALTER TABLE "HrSalaryComponentGroup" ADD CONSTRAINT "HrSalaryComponentGroup_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrSalaryComponent" ADD CONSTRAINT "HrSalaryComponent_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrSalaryComponent" ADD CONSTRAINT "HrSalaryComponent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "HrSalaryComponentGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HrSalaryComponentMapping" ADD CONSTRAINT "HrSalaryComponentMapping_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrSalaryComponentMapping" ADD CONSTRAINT "HrSalaryComponentMapping_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "HrSalaryComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrSalaryComponentMapping" ADD CONSTRAINT "HrSalaryComponentMapping_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "HrSalaryStructureTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HrSalaryComponentHistory" ADD CONSTRAINT "HrSalaryComponentHistory_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrSalaryComponentHistory" ADD CONSTRAINT "HrSalaryComponentHistory_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "HrSalaryComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
