-- CreateTable
CREATE TABLE "system_locations" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT 'India',
    "pincode" TEXT NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemCoreConfig" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "maintenanceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT NOT NULL DEFAULT 'System is under maintenance. Please try again later.',
    "maintenanceAllowAdmins" BOOLEAN NOT NULL DEFAULT true,
    "maintenanceScheduledAt" TIMESTAMP(3),
    "maintenanceEndsAt" TIMESTAMP(3),
    "maxConcurrentSessions" INTEGER NOT NULL DEFAULT 500,
    "maxStorageGb" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "maxUploadMb" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "maxApiRequestsPerMinute" INTEGER NOT NULL DEFAULT 120,
    "cacheEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cacheTtlSeconds" INTEGER NOT NULL DEFAULT 300,
    "cacheInvalidationMode" TEXT NOT NULL DEFAULT 'TTL',
    "cacheLastFlushedAt" TIMESTAMP(3),
    "queryTimeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "workerConcurrency" INTEGER NOT NULL DEFAULT 4,
    "backgroundQueueSize" INTEGER NOT NULL DEFAULT 100,
    "apmThresholdMs" INTEGER NOT NULL DEFAULT 2000,
    "currentAppVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemCoreConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemUpdateRecord" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "versionFrom" TEXT NOT NULL,
    "versionTo" TEXT NOT NULL,
    "updateType" TEXT NOT NULL DEFAULT 'PATCH',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "packageName" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "executedAt" TIMESTAMP(3),
    "executedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemUpdateRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemDbOptimizationRun" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "tablesProcessed" INTEGER NOT NULL DEFAULT 0,
    "indexesRebuilt" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "details" TEXT NOT NULL DEFAULT '',
    "triggeredBy" TEXT NOT NULL DEFAULT 'Admin',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SystemDbOptimizationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettingsAuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "userId" TEXT NOT NULL DEFAULT '',
    "userEmail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemSettingsAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_locations_institutionId_branchCode_key" ON "system_locations"("institutionId", "branchCode");

-- CreateIndex
CREATE INDEX "system_locations_institutionId_isPrimary_idx" ON "system_locations"("institutionId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "SystemCoreConfig_institutionId_key" ON "SystemCoreConfig"("institutionId");

-- CreateIndex
CREATE INDEX "SystemUpdateRecord_institutionId_createdAt_idx" ON "SystemUpdateRecord"("institutionId", "createdAt");

-- CreateIndex
CREATE INDEX "SystemDbOptimizationRun_institutionId_startedAt_idx" ON "SystemDbOptimizationRun"("institutionId", "startedAt");

-- CreateIndex
CREATE INDEX "SystemSettingsAuditLog_institutionId_category_createdAt_idx" ON "SystemSettingsAuditLog"("institutionId", "category", "createdAt");

-- AddForeignKey
ALTER TABLE "system_locations" ADD CONSTRAINT "system_locations_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemCoreConfig" ADD CONSTRAINT "SystemCoreConfig_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemUpdateRecord" ADD CONSTRAINT "SystemUpdateRecord_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemDbOptimizationRun" ADD CONSTRAINT "SystemDbOptimizationRun_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSettingsAuditLog" ADD CONSTRAINT "SystemSettingsAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
