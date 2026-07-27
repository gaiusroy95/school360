-- Security, Audit & Compliance module

CREATE TABLE "SecurityPolicyConfig" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "minPasswordLength" INTEGER NOT NULL DEFAULT 8,
    "requireSpecialChar" BOOLEAN NOT NULL DEFAULT true,
    "requireNumber" BOOLEAN NOT NULL DEFAULT true,
    "maxFailedAttempts" INTEGER NOT NULL DEFAULT 5,
    "lockoutMinutes" INTEGER NOT NULL DEFAULT 15,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 60,
    "ipAllowlist" JSONB NOT NULL DEFAULT '[]',
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorMethod" TEXT NOT NULL DEFAULT 'Authenticator App',
    "autoBackupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupFrequency" TEXT NOT NULL DEFAULT 'Daily',
    "backupTime" TEXT NOT NULL DEFAULT '02:00 AM',
    "retainBackupDays" INTEGER NOT NULL DEFAULT 30,
    "allowSelfRestore" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityPolicyConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SecurityPolicyConfig_institutionId_key" ON "SecurityPolicyConfig"("institutionId");

CREATE TABLE "SecurityEncryptionPolicy" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'AES-256',
    "piiFields" JSONB NOT NULL DEFAULT '[]',
    "vaultProvider" TEXT NOT NULL DEFAULT 'INTERNAL_VAULT',
    "vaultKeyId" TEXT NOT NULL DEFAULT '',
    "keyRotationDays" INTEGER NOT NULL DEFAULT 90,
    "lastRotatedAt" TIMESTAMP(3),
    "encryptAtRest" BOOLEAN NOT NULL DEFAULT true,
    "encryptInTransit" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityEncryptionPolicy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecurityEncryptionPolicy_institutionId_isActive_idx" ON "SecurityEncryptionPolicy"("institutionId", "isActive");

CREATE TABLE "backup_destinations" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "destinationType" TEXT NOT NULL DEFAULT 'LOCAL',
    "label" TEXT NOT NULL DEFAULT '',
    "uri" TEXT NOT NULL DEFAULT '',
    "credentialsRef" TEXT NOT NULL DEFAULT '',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastValidatedAt" TIMESTAMP(3),
    "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_destinations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "backup_destinations_institutionId_isActive_idx" ON "backup_destinations"("institutionId", "isActive");

CREATE TABLE "BackupExecution" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "destinationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "triggerType" TEXT NOT NULL DEFAULT 'MANUAL',
    "archivePath" TEXT NOT NULL DEFAULT '',
    "checksum" TEXT NOT NULL DEFAULT '',
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    "tablesCount" INTEGER NOT NULL DEFAULT 0,
    "logDetails" TEXT NOT NULL DEFAULT '',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "triggeredBy" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "BackupExecution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BackupExecution_institutionId_startedAt_idx" ON "BackupExecution"("institutionId", "startedAt");

CREATE TABLE "SecurityLoginSession" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userRole" TEXT NOT NULL DEFAULT '',
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "geoLocation" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt" TIMESTAMP(3),

    CONSTRAINT "SecurityLoginSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecurityLoginSession_institutionId_status_loginAt_idx" ON "SecurityLoginSession"("institutionId", "status", "loginAt");

CREATE TABLE "SecurityUserActivityLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL DEFAULT '',
    "entityType" TEXT NOT NULL DEFAULT '',
    "entityId" TEXT NOT NULL DEFAULT '',
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityUserActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecurityUserActivityLog_institutionId_userId_createdAt_idx" ON "SecurityUserActivityLog"("institutionId", "userId", "createdAt");

CREATE TABLE "SecurityDataChangeLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL DEFAULT '',
    "operation" TEXT NOT NULL,
    "beforeData" JSONB,
    "afterData" JSONB,
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityDataChangeLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecurityDataChangeLog_institutionId_tableName_createdAt_idx" ON "SecurityDataChangeLog"("institutionId", "tableName", "createdAt");

CREATE TABLE "SecurityLoginHistory" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT '',
    "userEmail" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "geoLocation" TEXT NOT NULL DEFAULT '',
    "failureReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityLoginHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecurityLoginHistory_institutionId_createdAt_idx" ON "SecurityLoginHistory"("institutionId", "createdAt");

CREATE TABLE "SecurityActionHistory" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "actionCategory" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'HIGH',
    "entityType" TEXT NOT NULL DEFAULT '',
    "entityId" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "isAnomalous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityActionHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecurityActionHistory_institutionId_actionCategory_createdAt_idx" ON "SecurityActionHistory"("institutionId", "actionCategory", "createdAt");

CREATE TABLE "export_logs" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "exportFormat" TEXT NOT NULL,
    "fileName" TEXT NOT NULL DEFAULT '',
    "module" TEXT NOT NULL DEFAULT '',
    "rowsExported" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "export_logs_institutionId_createdAt_idx" ON "export_logs"("institutionId", "createdAt");

CREATE TABLE "SecurityAuditReport" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL DEFAULT 'COMPLIANCE',
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "modules" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'GENERATING',
    "checksum" TEXT NOT NULL DEFAULT '',
    "summary" JSONB,
    "filePath" TEXT NOT NULL DEFAULT '',
    "generatedBy" TEXT NOT NULL DEFAULT '',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecurityAuditReport_institutionId_generatedAt_idx" ON "SecurityAuditReport"("institutionId", "generatedAt");

ALTER TABLE "SecurityPolicyConfig" ADD CONSTRAINT "SecurityPolicyConfig_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityEncryptionPolicy" ADD CONSTRAINT "SecurityEncryptionPolicy_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "backup_destinations" ADD CONSTRAINT "backup_destinations_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BackupExecution" ADD CONSTRAINT "BackupExecution_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BackupExecution" ADD CONSTRAINT "BackupExecution_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "backup_destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SecurityLoginSession" ADD CONSTRAINT "SecurityLoginSession_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityUserActivityLog" ADD CONSTRAINT "SecurityUserActivityLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityDataChangeLog" ADD CONSTRAINT "SecurityDataChangeLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityLoginHistory" ADD CONSTRAINT "SecurityLoginHistory_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityActionHistory" ADD CONSTRAINT "SecurityActionHistory_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "export_logs" ADD CONSTRAINT "export_logs_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityAuditReport" ADD CONSTRAINT "SecurityAuditReport_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
