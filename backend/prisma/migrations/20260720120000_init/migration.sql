-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'STAFF');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionSetup" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "basicInformation" JSONB NOT NULL DEFAULT '{}',
    "academicSetup" JSONB NOT NULL DEFAULT '{}',
    "classesSections" JSONB NOT NULL DEFAULT '{}',
    "subjectsSetup" JSONB NOT NULL DEFAULT '{}',
    "departmentsSetup" JSONB NOT NULL DEFAULT '{}',
    "sessionTermSetup" JSONB NOT NULL DEFAULT '{}',
    "gradeMarksSetup" JSONB NOT NULL DEFAULT '{}',
    "feeGroupSetup" JSONB NOT NULL DEFAULT '{}',
    "documentSetup" JSONB NOT NULL DEFAULT '{}',
    "idCardNumbering" JSONB NOT NULL DEFAULT '{}',
    "calendarSetup" JSONB NOT NULL DEFAULT '{}',
    "customFieldsSetup" JSONB NOT NULL DEFAULT '{}',
    "notificationSetup" JSONB NOT NULL DEFAULT '{}',
    "otherPreferences" JSONB NOT NULL DEFAULT '{}',
    "integrationSetup" JSONB NOT NULL DEFAULT '{}',
    "backupRecovery" JSONB NOT NULL DEFAULT '{}',
    "securitySettings" JSONB NOT NULL DEFAULT '{}',
    "dataImportExport" JSONB NOT NULL DEFAULT '{}',
    "expressSetupCompletedAt" TIMESTAMP(3),
    "lastExpressImportMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionSetup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionSetup_institutionId_key" ON "InstitutionSetup"("institutionId");

-- AddForeignKey
ALTER TABLE "InstitutionSetup" ADD CONSTRAINT "InstitutionSetup_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
