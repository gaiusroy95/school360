-- Image 3 E2E: Security, Backup & Audit

ALTER TABLE "SecurityPolicyConfig" ADD COLUMN IF NOT EXISTS "requireMfaForAdmins" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SecurityPolicyConfig" ADD COLUMN IF NOT EXISTS "requireMfaForAll" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SecurityDataChangeLog" ADD COLUMN IF NOT EXISTS "integrityHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SecurityActionHistory" ADD COLUMN IF NOT EXISTS "integrityHash" TEXT NOT NULL DEFAULT '';

CREATE TABLE "firewall_rules" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "cidr" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'BLOCK',
    "label" TEXT NOT NULL DEFAULT '',
    "isDeployed" BOOLEAN NOT NULL DEFAULT false,
    "deployedAt" TIMESTAMP(3),
    "deployDetails" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "firewall_rules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "firewall_rules_institutionId_isDeployed_idx" ON "firewall_rules"("institutionId", "isDeployed");
ALTER TABLE "firewall_rules" ADD CONSTRAINT "firewall_rules_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_mfa_enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "enrolledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_mfa_enrollments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_mfa_enrollments_userId_key" ON "user_mfa_enrollments"("userId");
ALTER TABLE "user_mfa_enrollments" ADD CONSTRAINT "user_mfa_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "backup_restore_jobs" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "backupExecutionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmedBy" TEXT NOT NULL DEFAULT '',
    "maintenanceUsed" BOOLEAN NOT NULL DEFAULT true,
    "details" TEXT NOT NULL DEFAULT '',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "backup_restore_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "backup_restore_jobs_institutionId_startedAt_idx" ON "backup_restore_jobs"("institutionId", "startedAt");
ALTER TABLE "backup_restore_jobs" ADD CONSTRAINT "backup_restore_jobs_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "backup_restore_jobs" ADD CONSTRAINT "backup_restore_jobs_backupExecutionId_fkey" FOREIGN KEY ("backupExecutionId") REFERENCES "BackupExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "forensic_audit_export_jobs" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "format" TEXT NOT NULL DEFAULT 'CSV',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "downloadPath" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3),
    "requestedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "forensic_audit_export_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "forensic_audit_export_jobs_institutionId_status_createdAt_idx" ON "forensic_audit_export_jobs"("institutionId", "status", "createdAt");
ALTER TABLE "forensic_audit_export_jobs" ADD CONSTRAINT "forensic_audit_export_jobs_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
