-- Fee refund deposit snapshot + pending approver routing
ALTER TABLE "FeeRefund" ADD COLUMN IF NOT EXISTS "depositBreakdown" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "FeeRefund" ADD COLUMN IF NOT EXISTS "pendingApproverRole" TEXT NOT NULL DEFAULT '';
ALTER TABLE "FeeRefund" ADD COLUMN IF NOT EXISTS "pendingApproverName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "FeeRefund" ADD COLUMN IF NOT EXISTS "pendingApproverEmail" TEXT NOT NULL DEFAULT '';

-- HR approval hierarchy mappings (module role → person)
CREATE TABLE IF NOT EXISTS "module_approval_mappings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "moduleLabel" TEXT NOT NULL DEFAULT '',
    "roleKey" TEXT NOT NULL,
    "roleLabel" TEXT NOT NULL DEFAULT '',
    "employeeId" TEXT NOT NULL DEFAULT '',
    "assigneeName" TEXT NOT NULL DEFAULT '',
    "assigneeEmail" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "module_approval_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "module_approval_mappings_institutionId_moduleCode_roleKey_key"
  ON "module_approval_mappings"("institutionId", "moduleCode", "roleKey");

CREATE INDEX IF NOT EXISTS "module_approval_mappings_institutionId_moduleCode_idx"
  ON "module_approval_mappings"("institutionId", "moduleCode");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'module_approval_mappings_institutionId_fkey'
  ) THEN
    ALTER TABLE "module_approval_mappings"
      ADD CONSTRAINT "module_approval_mappings_institutionId_fkey"
      FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
