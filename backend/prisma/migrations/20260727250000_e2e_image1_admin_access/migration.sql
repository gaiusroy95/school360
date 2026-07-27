-- Image 1 E2E: Admin Dashboard alerts + role hierarchy

ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "parentRoleId" TEXT;
CREATE INDEX IF NOT EXISTS "roles_institutionId_parentRoleId_idx" ON "roles"("institutionId", "parentRoleId");
ALTER TABLE "roles" ADD CONSTRAINT "roles_parentRoleId_fkey" FOREIGN KEY ("parentRoleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "system_alerts" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "category" TEXT NOT NULL DEFAULT 'SYSTEM',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "acknowledgedBy" TEXT NOT NULL DEFAULT '',
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedBy" TEXT NOT NULL DEFAULT '',
    "resolvedAt" TIMESTAMP(3),
    "sourceModule" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "system_alerts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "system_alerts_institutionId_status_createdAt_idx" ON "system_alerts"("institutionId", "status", "createdAt");
ALTER TABLE "system_alerts" ADD CONSTRAINT "system_alerts_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
