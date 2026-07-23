-- CreateEnum
CREATE TYPE "MobileAppRole" AS ENUM ('STUDENT', 'PARENT', 'TEACHER', 'PRINCIPAL', 'TRANSPORT');

-- CreateEnum
CREATE TYPE "MobileDevicePlatform" AS ENUM ('IOS', 'ANDROID', 'WEB', 'OTHER');

-- CreateTable
CREATE TABLE "MobileAccount" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "role" "MobileAppRole" NOT NULL,
    "admissionNumber" TEXT NOT NULL DEFAULT '',
    "employeeCode" TEXT NOT NULL DEFAULT '',
    "registeredMobile" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "mustResetPassword" BOOLEAN NOT NULL DEFAULT true,
    "displayName" TEXT NOT NULL,
    "studentId" TEXT,
    "parentKey" TEXT NOT NULL DEFAULT '',
    "parentRelationship" "ParentRelationship",
    "teacherProfileId" TEXT,
    "staffProfileId" TEXT,
    "studentIds" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileDevice" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "platform" "MobileDevicePlatform" NOT NULL DEFAULT 'OTHER',
    "deviceName" TEXT NOT NULL DEFAULT '',
    "appVersion" TEXT NOT NULL DEFAULT '',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileNotification" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'general',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileUpload" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "storagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileAccount_institutionId_role_admissionNumber_registeredMobile_key" ON "MobileAccount"("institutionId", "role", "admissionNumber", "registeredMobile");

-- CreateIndex
CREATE UNIQUE INDEX "MobileAccount_institutionId_role_employeeCode_registeredMobile_key" ON "MobileAccount"("institutionId", "role", "employeeCode", "registeredMobile");

-- CreateIndex
CREATE INDEX "MobileAccount_institutionId_studentId_idx" ON "MobileAccount"("institutionId", "studentId");

-- CreateIndex
CREATE INDEX "MobileAccount_institutionId_parentKey_idx" ON "MobileAccount"("institutionId", "parentKey");

-- CreateIndex
CREATE INDEX "MobileAccount_institutionId_role_isActive_idx" ON "MobileAccount"("institutionId", "role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MobileDevice_accountId_fcmToken_key" ON "MobileDevice"("accountId", "fcmToken");

-- CreateIndex
CREATE INDEX "MobileDevice_accountId_idx" ON "MobileDevice"("accountId");

-- CreateIndex
CREATE INDEX "MobileNotification_accountId_readAt_createdAt_idx" ON "MobileNotification"("accountId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "MobileNotification_institutionId_accountId_idx" ON "MobileNotification"("institutionId", "accountId");

-- CreateIndex
CREATE INDEX "MobileUpload_accountId_createdAt_idx" ON "MobileUpload"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "MobileUpload_institutionId_studentId_idx" ON "MobileUpload"("institutionId", "studentId");

-- AddForeignKey
ALTER TABLE "MobileAccount" ADD CONSTRAINT "MobileAccount_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileDevice" ADD CONSTRAINT "MobileDevice_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MobileAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileNotification" ADD CONSTRAINT "MobileNotification_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileNotification" ADD CONSTRAINT "MobileNotification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MobileAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileUpload" ADD CONSTRAINT "MobileUpload_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileUpload" ADD CONSTRAINT "MobileUpload_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MobileAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
